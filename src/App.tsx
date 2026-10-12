import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout/Layout';
import { RequireRole, RequireSession } from './auth/guards';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { RegisterPage } from './pages/RegisterPage/RegisterPage';
import { CartPage } from './pages/CartPage/CartPage';
import { AdminProductsPage } from './pages/AdminProductsPage/AdminProductsPage';
import { StorePage } from './pages/StorePage/StorePage';
import { AdminOrdersPage, MyOrdersPage } from './pages/OrdersPage/OrdersPage';
import { PaymentResultPage } from './pages/PaymentResultPage/PaymentResultPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/acceso" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        {/* La tienda y el carrito son públicos: se arman sin cuenta y la cuenta
            se pide recién al pagar. */}
        <Route path="/" element={<StorePage />} />
        <Route path="/carrito" element={<CartPage />} />
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
        <Route
          path="/admin/productos"
          element={
            <RequireSession>
              <RequireRole role="ADMIN">
                <AdminProductsPage />
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
