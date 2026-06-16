import { Route, Routes } from "react-router-dom";
import Notifications from "./Notifications";

export const NotificationRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<Notifications />} />
        </Routes>
    );
};