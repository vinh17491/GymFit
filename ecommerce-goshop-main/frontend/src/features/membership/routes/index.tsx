import { Route, Routes } from "react-router-dom";
import Membership from "./Membership";

export const MembershipRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<Membership />} />
        </Routes>
    );
};