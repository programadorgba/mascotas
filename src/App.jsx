import { Navigate, Route, Routes } from 'react-router-dom'
import { OwnerRoute } from './features/owners/components/OwnerRoute.jsx'
import { VetRoute } from './features/veterinarians/components/VetRoute.jsx'
import { AppShell } from './shared/components/AppShell.jsx'
import Login from './shared/components/Login.jsx'
import Register from './shared/components/Register.jsx'
import OwnerDashboard from './features/owners/pages/OwnerDashboard.jsx'
import PetForm from './features/owners/pages/PetForm.jsx'
import PetDetail from './features/owners/pages/PetDetail.jsx'
import VetSearch from './features/veterinarians/pages/VetSearch.jsx'
import VetPetRecord from './features/veterinarians/pages/VetPetRecord.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route element={<OwnerRoute />}>
        <Route element={<AppShell area="owner" />}>
          <Route path="/" element={<Navigate to="/mascotas" replace />} />
          <Route path="/mascotas" element={<OwnerDashboard />} />
          <Route path="/mascotas/nueva" element={<PetForm />} />
          <Route path="/mascotas/:petId" element={<PetDetail />} />
        </Route>
      </Route>

      <Route element={<VetRoute />}>
        <Route element={<AppShell area="vet" />}>
          <Route path="/veterinario" element={<VetSearch />} />
          <Route path="/veterinario/mascotas/:petId" element={<VetPetRecord />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
