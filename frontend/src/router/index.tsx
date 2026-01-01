import { createBrowserRouter } from 'react-router-dom'
import Layout from '../app/components/Layout'
import Dashboard from '../pages/Dashboard'
import Chart from '../pages/Chart'
import Analysis from '../pages/Analysis'
import Pricing from '../pages/Pricing'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'chart',
        element: <Chart />,
      },
      {
        path: 'analysis',
        element: <Analysis />,
      },
      {
        path: 'pricing',
        element: <Pricing />,
      },
    ],
  },
])

