import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes";
import ErrorBoundary from "./components/ErrorBoundary";

const App = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <ToastContainer 
                    autoClose={3500}
                    draggable={false}
                    pauseOnHover={false}
                />
                <AppRoutes />
            </AuthProvider>
        </ErrorBoundary>
    );
};

export default App;