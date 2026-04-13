"""
Intel enrichment and editorial generation.
Supports heuristic enrichment with optional LLM provider override.
"""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import logging
import os
import re
from typing import Any, Dict, List

import requests

from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

CACHE_VERSION = "v6"

TOPIC_RULES = {
    "seguranca": ["security", "breach", "exploit", "malware", "vulnerability", "attack", "seed", "seguranca", "segurança"],
    "identidade": ["identity", "wallet", "authentication", "auth", "passport", "kyc", "credential", "identidade", "credencial"],
    "defi": ["defi", "liquidity", "trading", "swap", "market", "exchange", "yield", "stablecoin", "mercado"],
    "infra": ["rollup", "bridge", "api", "developer", "cloud", "protocol", "network", "rpc", "infraestrutura"],
    "ia": ["ai", "llm", "model", "agent", "openai", "inteligencia artificial"],
    "tech": ["technology", "tech", "software", "hardware", "chip", "chips", "device", "developer tool", "platform", "tecnologia"],
    "economia": ["economy", "economic", "economics", "macro", "inflation", "rates", "fed", "treasury", "yield", "gdp", "jobs", "economia", "juros", "inflação", "inflacao", "macroeconomia"],
    "geopolitica": ["geopolitics", "geopolitical", "war", "sanction", "sanctions", "china", "russia", "europe", "us policy", "trade policy", "geopolitica", "geopolítica", "guerra", "sancoes", "sanções"],
}

CHAIN_RULES = {
    "ethereum": ["ethereum", "eth"],
    "bitcoin": ["bitcoin", "btc"],
    "solana": ["solana", "sol"],
    "base": ["base"],
    "arbitrum": ["arbitrum"],
    "optimism": ["optimism", "op stack"],
    "scroll": ["scroll"],
    "polygon": ["polygon", "matic"],
}

PROTOCOL_RULES = {
    "uniswap": ["uniswap"],
    "aave": ["aave"],
    "maker": ["maker", "sky"],
    "hyperliquid": ["hyperliquid"],
    "chainlink": ["chainlink"],
}

ASSET_RULES = {
    "BTC": ["bitcoin", "btc"],
    "ETH": ["ethereum", "eth"],
    "SOL": ["solana", "sol"],
    "MATIC": ["polygon", "matic"],
    "USDC": ["usdc"],
    "USDT": ["usdt", "tether"],
}


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _module_hint(title: str, url: str) -> str:
    text = f"{title} {url}".lower()
    if any(token in text for token in ["wallet", "identity", "passport", "kyc", "auth"]):
        return "Passport"
    if any(token in text for token in ["vault", "security", "custody", "private key", "seed"]):
        return "Vault"
    if any(token in text for token in ["api", "credential", "token", "access", "key "]):
        return "Keys"
    if any(token in text for token in ["defi", "exchange", "market", "trading", "liquidity", "crypto"]):
        return "Radar"
    return "Explore"


def _agent_note(module: str) -> str:
    if module == "Radar":
        return "Leitura de mercado útil para contexto tático."
    if module == "Passport":
        return "Sinal de identidade e autenticação relevante para o OS."
    if module == "Vault":
        return "Contexto de segurança que pode afetar custódia e exposição."
    if module == "Keys":
        return "Leitura útil para APIs, credenciais e superfícies de acesso."
    return "Contexto geral do ecossistema para acompanhamento."


def _normalized_text(text: str) -> str:
    lowered = text.lower()
    lowered = re.sub(r"[^a-z0-9\s:/._-]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", _normalized_text(text)))


def _extract_matches(text: str, rules: Dict[str, List[str]]) -> List[str]:
    matches: List[str] = []
    haystack = _normalized_text(text)
    word_tokens = _tokenize(text)
    for label, rule_tokens in rules.items():
        found = False
        for token in rule_tokens:
            normalized = _normalized_text(token)
            if " " in normalized:
                if f" {normalized} " in f" {haystack} ":
                    found = True
                    break
            elif normalized in word_tokens:
                found = True
                break
        if found:
            matches.append(label)
    return matches


def _impact_score(points: int, comments: int, topics: List[str], chains: List[str], source_tier: str) -> Dict[str, Any]:
    tier_bonus = {"protocol": 18, "media": 12, "community": 8}.get(source_tier, 6)
    score = min(100, tier_bonus + (points * 2) + (comments * 3) + (len(topics) * 6) + (len(chains) * 8))
    if score >= 80:
        label = "alto"
    elif score >= 50:
        label = "medio"
    else:
        label = "baixo"
    return {
        "label": label,
        "score": score,
        "direction": "neutra",
    }


def _summary_pt(module: str, title_original: str, topics: List[str], chains: List[str]) -> str:
    topic_text = ", ".join(topics[:2]) if topics else "ecossistema"
    chain_text = ", ".join(chains[:2]) if chains else "multichain"
    if module == "Radar":
        return (
            f"Leitura de mercado em {topic_text} com possível reflexo em liquidez, sentimento "
            f"e execução nas superfícies de {chain_text}. Manchete original: \"{title_original}\"."
        )
    if module == "Passport":
        return (
            f"Sinal de identidade e acesso com impacto potencial em autenticação, credenciais "
            f"e segurança operacional. Manchete original: \"{title_original}\"."
        )
    if module == "Vault":
        return (
            f"Contexto de segurança relevante para custódia, exposição operacional e proteção "
            f"de ativos. Manchete original: \"{title_original}\"."
        )
    if module == "Keys":
        return (
            f"Leitura de infraestrutura e credenciais com possível efeito sobre integrações, "
            f"APIs e governança de acessos. Manchete original: \"{title_original}\"."
        )
    return (
        f"Briefing operacional em {topic_text} com sinais úteis para acompanhamento "
        f"do ecossistema {chain_text}. Manchete original: \"{title_original}\"."
    )


def _why_it_matters(module: str, topics: List[str], chains: List[str]) -> str:
    topic_text = ", ".join(topics[:2]) if topics else "atividade do ecossistema"
    chain_text = ", ".join(chains[:2]) if chains else "operações multichain"
    if module == "Radar":
        return f"Pode alterar a leitura de risco, fluxo e oportunidade em {topic_text}, com reflexo em {chain_text}."
    if module == "Passport":
        return f"Afeta a tese de identidade e confiança operacional, especialmente em {topic_text}."
    if module == "Vault":
        return f"Pode mudar a postura de segurança, custódia e monitoramento de risco em {chain_text}."
    if module == "Keys":
        return f"É relevante para controle de credenciais, APIs e superfícies de integração em {topic_text}."
    return f"Ajuda a priorizar monitoramento e contexto em {topic_text} dentro de {chain_text}."


def _watch_items(topics: List[str], chains: List[str], module: str) -> List[str]:
    watch: List[str] = []
    if chains:
        watch.append(f"atividade em {chains[0]}")
    if "defi" in topics:
        watch.append("liquidez e rotas de execução")
    if "seguranca" in topics:
        watch.append("novos riscos e vetores de ataque")
    if "identidade" in topics:
        watch.append("mudanças em autenticação e credenciais")
    if not watch:
        watch.append(f"sinais operacionais para {module}")
    return watch[:3]


def _surface(module: str) -> List[str]:
    if module == "Radar":
        return ["Radar", "Swap", "Vault"]
    if module == "Passport":
        return ["Passport", "Home"]
    if module == "Vault":
        return ["Vault", "Secrets"]
    if module == "Keys":
        return ["Keys", "Secrets"]
    return ["Home", "Radar"]


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "intel-post"


def _extract_json(text: str) -> Dict[str, Any] | None:
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except Exception:
        return None


def _normalize_tldr(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        cleaned = value.strip()
        return [cleaned] if cleaned else []
    return []


def _normalize_post_kind(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in {"briefing", "dossier"} else "dossier"


def _openai_chat_payload(model: str, messages: List[Dict[str, str]]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "response_format": {"type": "json_object"},
    }
    if not model.startswith("gpt-5"):
        payload["temperature"] = 0.4
    return payload


class IntelEnricher:
    def __init__(self):
        self.provider = os.getenv("INTEL_ENRICHMENT_PROVIDER", "heuristic").strip().lower()
        self.model = os.getenv("INTEL_ENRICHMENT_MODEL", "gpt-4.1-mini")
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.redis = SafeRedis()
        provider_state = "enabled" if self.provider != "heuristic" and self.api_key else "fallback"
        logger.info(
            "Intel enrichment provider=%s model=%s state=%s",
            self.provider,
            self.model,
            provider_state,
        )

    def enrich_item(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        cache_key = self._cache_key("enrich", raw_item["id"])
        cached = self.redis.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        item = self._heuristic_enrichment(raw_item)

        try:
            self.redis.setex(cache_key, 900, json.dumps(item))
        except Exception:
            pass
        return item

    def build_post(self, item: Dict[str, Any]) -> Dict[str, Any]:
        slug = _slugify(item.get("title_pt") or item.get("title") or item["id"])
        cache_key = self._cache_key("post", slug)
        cached = self.redis.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

        post = self._llm_post(item)
        if not post:
            editorial_kind = _normalize_post_kind(item.get("editorial_kind"))
            return {
                "id": f"post:{slug}",
                "slug": slug,
                "title": item.get("title_pt") or item.get("title") or item.get("title_original") or slug,
                "subtitle": "",
                "excerpt": "",
                "body_markdown": "",
                "tldr": [],
                "topics": item.get("topics", []),
                "chains": item.get("chains", []),
                "protocols": item.get("protocols", []),
                "assets": item.get("assets", []),
                "sources": [{"name": item.get("source", "Unknown"), "url": item.get("url", "")}],
                "status": "generation_failed",
                "generated_at": _iso_now(),
                "reading_time_minutes": 0,
                "editorial_kind": editorial_kind,
            }

        try:
            self.redis.setex(cache_key, 1800, json.dumps(post))
        except Exception:
            pass
        return post

    def _cache_key(self, kind: str, seed: str) -> str:
        digest = hashlib.sha1(seed.encode("utf-8")).hexdigest()
        return f"intel:{kind}:{CACHE_VERSION}:{self.provider}:{digest}"

    def _heuristic_enrichment(self, raw_item: Dict[str, Any]) -> Dict[str, Any]:
        title_original = raw_item["title"]
        text = f"{raw_item['title']} {raw_item['url']} {' '.join(raw_item.get('tags', []))}"
        module = _module_hint(title_original, raw_item["url"])
        topics = _extract_matches(text, TOPIC_RULES)
        chains = _extract_matches(text, CHAIN_RULES)
        protocols = _extract_matches(text, PROTOCOL_RULES)
        assets = _extract_matches(text, ASSET_RULES)
        impact = _impact_score(
            raw_item.get("points", 0),
            raw_item.get("comments", 0),
            topics,
            chains,
            raw_item.get("source_tier", "community"),
        )
        return {
            "id": raw_item["id"],
            "title": title_original,
            "title_original": title_original,
            "title_pt": title_original,
            "summary": "",
            "summary_pt": "",
            "url": raw_item["url"],
            "source": raw_item.get("source", "Unknown"),
            "source_tier": raw_item.get("source_tier", "community"),
            "author": raw_item.get("author", ""),
            "created_at": raw_item.get("created_at", _iso_now()),
            "points": raw_item.get("points", 0),
            "comments": raw_item.get("comments", 0),
            "language": "en",
            "translated": False,
            "module": module,
            "agent_note": "Fonte original sem resumo editorial.",
            "impact": impact,
            "topics": topics,
            "chains": chains,
            "protocols": protocols,
            "assets": assets,
            "why_it_matters": "",
            "watch_items": _watch_items(topics, chains, module),
            "surface": _surface(module),
        }

    def _llm_post(self, item: Dict[str, Any]) -> Dict[str, Any] | None:
        item_id = item.get("id") or _slugify(item.get("title_pt") or item.get("title") or "intel-item")
        if self.provider == "heuristic":
            logger.info("Intel LLM post skipped for %s: provider set to heuristic", item_id)
            return None

        if not self.api_key:
            logger.warning("Intel LLM post skipped for %s: OPENAI_API_KEY missing", item_id)
            return None

        editorial_kind = _normalize_post_kind(item.get("editorial_kind"))
        if editorial_kind == "briefing":
            instruction = (
                "Escreva um briefing em pt-BR para a Intelligence Layer do SNE OS. "
                "Formato enxuto, claro e orientado a operação. "
                "Responda em JSON com title, subtitle, excerpt, body_markdown e tldr. "
                "body_markdown deve ter entre 220 e 420 palavras, com seções curtas e foco em contexto imediato. "
                "Quando fizer sentido, enquadre a leitura em temas como tech, economia e geopolítica."
            )
        else:
            instruction = (
                "Escreva um dossie em pt-BR para a Intelligence Layer do SNE OS. "
                "A leitura deve ter profundidade editorial, contexto de mercado/produto e implicações operacionais. "
                "Responda em JSON com title, subtitle, excerpt, body_markdown e tldr. "
                "body_markdown deve ter entre 700 e 1100 palavras, com seções em markdown, analise propria e fechamento editorial. "
                "Quando fizer sentido, enquadre a leitura em temas como tech, economia e geopolítica."
            )

        prompt = {
            "item": item,
            "instruction": instruction,
        }
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=_openai_chat_payload(
                    self.model,
                    [
                        {
                            "role": "system",
                            "content": (
                                "Voce e o editor-chefe da Intelligence Layer do SNE OS. "
                                "Produza JSON valido em pt-BR, sem markdown fora do campo body_markdown. "
                                "Nao invente fatos fora do contexto fornecido, mas produza leitura propria e conclusoes operacionais."
                            ),
                        },
                        {
                            "role": "user",
                            "content": json.dumps(prompt, ensure_ascii=False),
                        },
                    ],
                ),
                timeout=25,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            parsed = _extract_json(content)
            if not isinstance(parsed, dict):
                logger.warning("Intel LLM post returned non-JSON payload for %s", item_id)
                return None

            slug = _slugify(parsed.get("title") or item.get("title_pt") or item.get("title") or item_id)
            logger.info("Intel LLM post generation succeeded for %s", item_id)
            return {
                "id": f"post:{slug}",
                "slug": slug,
                "title": parsed.get("title") or item.get("title_pt") or item.get("title") or item_id,
                "subtitle": parsed.get("subtitle") or item.get("why_it_matters", ""),
                "excerpt": parsed.get("excerpt") or item.get("summary_pt", ""),
                "body_markdown": parsed.get("body_markdown") or "",
                "tldr": _normalize_tldr(parsed.get("tldr")) or [value for value in [item.get("summary_pt", ""), item.get("why_it_matters", "")] if value],
                "topics": item.get("topics", []),
                "chains": item.get("chains", []),
                "protocols": item.get("protocols", []),
                "assets": item.get("assets", []),
                "sources": [{"name": item.get("source", "Unknown"), "url": item.get("url", "")}],
                "status": "draft",
                "generated_at": _iso_now(),
                "reading_time_minutes": max(1, round(len((parsed.get("body_markdown") or "").split()) / 180)),
                "editorial_kind": editorial_kind,
            }
        except Exception as exc:
            logger.warning(f"Intel LLM post generation failed: {exc}")
            return None
