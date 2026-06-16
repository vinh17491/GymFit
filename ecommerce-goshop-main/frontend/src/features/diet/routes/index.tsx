import { Route, Routes } from "react-router-dom";
import DietList from "./DietList";
import DietDetail from "./DietDetail";

export const DietRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<DietList />} />
            <Route path=":id" element={<DietDetail />} />
        </Routes>
    );
};