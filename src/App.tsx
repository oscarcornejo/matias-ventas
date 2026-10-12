import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout/Layout';
import { RequireRole, RequireSession } from './auth/guards';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { StorePage } from './pages/StorePage/StorePage';
import { AdminOrdersPage, MyOrdersPage } from './pages/OrdersPage/OrdersPage';
import { PaymentResultPage } from './pages/PaymentResultPage/PaymentResultPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/acceso" element={<LoginPage />} />
        <Route path="/" element={<RequireSession><StorePage /></RequireSession>} />
        <Route
          path="/mis-compras"
          element={
            <RequireSession>
              <RequireRole role="CLIENTE">
                <MyOrdersPage />
              </RequireRole>
            </RequireSession>
          }
        />
        <Route
          path="/admin/compras"
          element={
            <RequireSession>
              <RequireRole role="ADMIN">
                <AdminOrdersPage />
              </RequireRole>
            </RequireSession>
          }
        />
        <Route path="/pago/aprobado" element={<RequireSession><PaymentResultPage result="aprobado" /></RequireSession>} />
        <Route path="/pago/pendiente" element={<RequireSession><PaymentResultPage result="pendiente" /></RequireSession>} />
        <Route path="/pago/rechazado" element={<RequireSession><PaymentResultPage result="rechazado" /></RequireSession>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
