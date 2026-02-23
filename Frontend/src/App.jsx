import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Bill from "./components/Bill/Bill";
import SavedBills from "./components/Savedbills/Savedbills";
import Customers from "./components/Customers/Customers";
import Login from "./components/Login/Login";
import "./App.css";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/bill" replace /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/bill"
          element={
            <PrivateRoute>
              <Bill />
            </PrivateRoute>
          }
        />

        <Route
          path="/saved-bills"
          element={
            <PrivateRoute>
              <SavedBills />
            </PrivateRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <PrivateRoute>
              <Customers />
            </PrivateRoute>
          }
        />

        <Route
          path="*"
          element={<p style={{ textAlign: "center", marginTop: "50px" }}>404 - Page Not Found</p>}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;