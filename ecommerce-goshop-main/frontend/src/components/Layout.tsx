import { Outlet } from "react-router-dom";
import Navbar from "./Elements/Navbar";

const Layout = () => {
    return (
        <div className="min-h-screen bg-main-gray">
            <div className="max-w-7xl mx-auto px-4">
                <Navbar />
            </div>
            <Outlet />
        </div>
    );
};

export default Layout;