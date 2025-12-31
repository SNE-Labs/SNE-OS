import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Transfer from './pages/Transfer'
import Spy from './pages/Spy'
import Public from './pages/Public'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/transfer" element={<Transfer />} />
          <Route path="/spy" element={<Spy />} />
          <Route path="/public/:address?" element={<Public />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
