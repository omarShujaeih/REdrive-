import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth.jsx';
import { AdminLayout, CompanyLayout, PublicLayout, RequireAuth } from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Search from './pages/Search.jsx';
import CarDetails from './pages/CarDetails.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import MyRentals from './pages/MyRentals.jsx';
import RentalDetails from './pages/RentalDetails.jsx';
import Favorites from './pages/Favorites.jsx';
import Notifications from './pages/Notifications.jsx';
import Profile from './pages/Profile.jsx';
import Assistant from './pages/Assistant.jsx';
import Terms from './pages/Terms.jsx';
import CompanyProfile from './pages/CompanyProfile.jsx';
import CoDashboard from './pages/company/Dashboard.jsx';
import CoCars from './pages/company/Cars.jsx';
import CoCarForm from './pages/company/CarForm.jsx';
import CoRequests from './pages/company/Requests.jsx';
import CoRentals from './pages/company/Rentals.jsx';
import CoRentalDetail from './pages/company/RentalDetail.jsx';
import CoFinance from './pages/company/Finance.jsx';
import CoRenterProfile from './pages/company/RenterProfile.jsx';
import AdminDashboard from './pages/admin/Dashboard.jsx';
import AdminVerify from './pages/admin/Verify.jsx';
import AdminCars from './pages/admin/Cars.jsx';
import AdminUsers from './pages/admin/Users.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="cars/:id" element={<CarDetails />} />
            <Route path="companies/:id" element={<CompanyProfile />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="terms" element={<Terms />} />
            <Route path="checkout/:carId" element={<RequireAuth roles={['renter']}><Checkout /></RequireAuth>} />
            <Route path="rentals" element={<RequireAuth roles={['renter']}><MyRentals /></RequireAuth>} />
            <Route path="rentals/:id" element={<RequireAuth roles={['renter']}><RentalDetails /></RequireAuth>} />
            <Route path="favorites" element={<RequireAuth roles={['renter']}><Favorites /></RequireAuth>} />
            <Route path="notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
            <Route path="profile" element={<RequireAuth><Profile /></RequireAuth>} />
          </Route>
          <Route path="company" element={<RequireAuth roles={['company']}><CompanyLayout /></RequireAuth>}>
            <Route index element={<CoDashboard />} />
            <Route path="cars" element={<CoCars />} />
            <Route path="cars/new" element={<CoCarForm />} />
            <Route path="cars/:id" element={<CoCarForm />} />
            <Route path="requests" element={<CoRequests />} />
            <Route path="rentals" element={<CoRentals />} />
            <Route path="rentals/:id" element={<CoRentalDetail />} />
            <Route path="finance" element={<CoFinance />} />
            <Route path="renters/:id" element={<CoRenterProfile />} />
            <Route path="settings" element={<Profile />} />
          </Route>
          <Route path="admin" element={<RequireAuth roles={['admin']}><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="verify" element={<AdminVerify />} />
            <Route path="cars" element={<AdminCars />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
