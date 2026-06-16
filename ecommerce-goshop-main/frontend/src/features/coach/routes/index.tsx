import { Route, Routes } from "react-router-dom";
import CoachesList from "./CoachesList";
import CoachDetail from "./CoachDetail";

export const CoachRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<CoachesList />} />
            <Route path=":id" element={<CoachDetail />} />
        </Routes>
    );
};
