import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Access from './pages/Access';
import Catalog from './pages/Catalog';
import LotPage from './pages/Lot';
import MyPurchases from './pages/MyPurchases';
import MyAccount from './pages/MyAccount';
import Markets from './pages/Markets';
import Legal from './pages/Legal';
import ProducerPanel from './pages/ProducerPanel';
import ProducerCreate from './pages/ProducerCreate';
import ProducerDone from './pages/ProducerDone';
import ProducerLot from './pages/ProducerLot';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/acceso" element={<Access />} />
      <Route path="/productos" element={<Catalog />} />
      <Route path="/productos/:id" element={<LotPage />} />
      <Route path="/mis-compras" element={<MyPurchases />} />
      <Route path="/mi-cuenta" element={<MyAccount />} />
      <Route path="/mercados" element={<Markets />} />
      <Route path="/productor" element={<ProducerPanel />} />
      <Route path="/productor/vender/listo" element={<ProducerDone />} />
      <Route path="/productor/vender/:step" element={<ProducerCreate />} />
      <Route path="/productor/producto/:id" element={<ProducerLot />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/info/:slug" element={<Legal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
