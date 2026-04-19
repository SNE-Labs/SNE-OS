const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SNE Keys sovereign access", function () {
  async function deployFixture() {
    const [owner, treasury, buyer, delegate, receiver, outsider] = await ethers.getSigners();

    const mockUsdtFactory = await ethers.getContractFactory("MockUSDT");
    const mockUsdt = await mockUsdtFactory.deploy();
    await mockUsdt.waitForDeployment();

    const operatorKeyFactory = await ethers.getContractFactory("OperatorKey");
    const operatorKey = await operatorKeyFactory.deploy(
      "https://assets.snelabs.space/keys/{id}.json",
      owner.address
    );
    await operatorKey.waitForDeployment();

    const keySaleFactory = await ethers.getContractFactory("KeySale");
    const operatorPrice = 250_000_000n;
    const keySale = await keySaleFactory.deploy(
      await mockUsdt.getAddress(),
      await operatorKey.getAddress(),
      treasury.address,
      operatorPrice,
      owner.address
    );
    await keySale.waitForDeployment();

    const delegationRegistryFactory = await ethers.getContractFactory("DelegationRegistry");
    const delegationRegistry = await delegationRegistryFactory.deploy(await operatorKey.getAddress());
    await delegationRegistry.waitForDeployment();

    await operatorKey.connect(owner).setSaleController(await keySale.getAddress());

    await mockUsdt.mint(buyer.address, 10_000_000_000n);
    await mockUsdt.mint(receiver.address, 10_000_000_000n);
    await mockUsdt.connect(buyer).approve(await keySale.getAddress(), 10_000_000_000n);
    await mockUsdt.connect(receiver).approve(await keySale.getAddress(), 10_000_000_000n);

    return {
      owner,
      treasury,
      buyer,
      delegate,
      receiver,
      outsider,
      mockUsdt,
      operatorKey,
      keySale,
      delegationRegistry,
      operatorPrice,
      operatorKeyId: 1n,
    };
  }

  it("mints Operator Key through the sale contract and forwards USDT to treasury", async function () {
    const { buyer, treasury, mockUsdt, operatorKey, keySale, operatorPrice, operatorKeyId } = await deployFixture();

    await expect(keySale.connect(buyer).buyOperatorKey(1))
      .to.emit(keySale, "OperatorKeyPurchased")
      .withArgs(buyer.address, operatorKeyId, 1, operatorPrice);

    expect(await operatorKey.balanceOf(buyer.address, operatorKeyId)).to.equal(1);
    expect(await mockUsdt.balanceOf(treasury.address)).to.equal(operatorPrice);
  });

  it("blocks purchases while the sale is paused", async function () {
    const { owner, buyer, keySale } = await deployFixture();

    await keySale.connect(owner).setPaused(true);

    await expect(keySale.connect(buyer).buyOperatorKey(1)).to.be.revertedWithCustomError(
      keySale,
      "SalePaused"
    );
  });

  it("allows owner to delegate operator access while retaining custody", async function () {
    const { buyer, delegate, keySale, delegationRegistry } = await deployFixture();

    await keySale.connect(buyer).buyOperatorKey(1);
    await expect(delegationRegistry.connect(buyer).setDelegate(delegate.address))
      .to.emit(delegationRegistry, "DelegateSet")
      .withArgs(buyer.address, delegate.address);

    expect(await delegationRegistry.delegateOf(buyer.address)).to.equal(delegate.address);
    expect(await delegationRegistry.ownerOfDelegate(delegate.address)).to.equal(buyer.address);
    expect(await delegationRegistry.hasEffectiveOperatorAccess(delegate.address)).to.equal(true);
    expect(await delegationRegistry.effectiveOwner(delegate.address)).to.equal(buyer.address);
  });

  it("invalidates delegated access immediately after the key is transferred", async function () {
    const { buyer, delegate, receiver, keySale, operatorKey, delegationRegistry, operatorKeyId } =
      await deployFixture();

    await keySale.connect(buyer).buyOperatorKey(1);
    await delegationRegistry.connect(buyer).setDelegate(delegate.address);

    await operatorKey
      .connect(buyer)
      .safeTransferFrom(buyer.address, receiver.address, operatorKeyId, 1, "0x");

    expect(await delegationRegistry.hasEffectiveOperatorAccess(delegate.address)).to.equal(false);
    expect(await delegationRegistry.effectiveOwner(delegate.address)).to.equal(ethers.ZeroAddress);
    expect(await delegationRegistry.hasEffectiveOperatorAccess(receiver.address)).to.equal(true);
    expect(await delegationRegistry.effectiveOwner(receiver.address)).to.equal(receiver.address);
  });

  it("prevents delegates from being reused across different owners", async function () {
    const { buyer, receiver, delegate, keySale, delegationRegistry } = await deployFixture();

    await keySale.connect(buyer).buyOperatorKey(1);
    await keySale.connect(receiver).buyOperatorKey(1);

    await delegationRegistry.connect(buyer).setDelegate(delegate.address);

    await expect(delegationRegistry.connect(receiver).setDelegate(delegate.address)).to.be.revertedWithCustomError(
      delegationRegistry,
      "DelegateAlreadyAssigned"
    );
  });

  it("lets the owner clear a delegate without affecting key custody", async function () {
    const { buyer, delegate, keySale, delegationRegistry } = await deployFixture();

    await keySale.connect(buyer).buyOperatorKey(1);
    await delegationRegistry.connect(buyer).setDelegate(delegate.address);

    await expect(delegationRegistry.connect(buyer).clearDelegate())
      .to.emit(delegationRegistry, "DelegateCleared")
      .withArgs(buyer.address, delegate.address);

    expect(await delegationRegistry.hasEffectiveOperatorAccess(delegate.address)).to.equal(false);
    expect(await delegationRegistry.ownerOfDelegate(delegate.address)).to.equal(ethers.ZeroAddress);
  });

  it("rejects delegation when the caller does not currently hold an Operator Key", async function () {
    const { outsider, delegate, delegationRegistry } = await deployFixture();

    await expect(delegationRegistry.connect(outsider).setDelegate(delegate.address)).to.be.revertedWithCustomError(
      delegationRegistry,
      "NoOperatorKey"
    );
  });
});
