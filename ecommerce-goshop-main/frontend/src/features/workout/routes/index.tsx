import { Route, Routes } from "react-router-dom";
import Workouts from "./Workouts";
import WorkoutDetail from "./WorkoutDetail";

export const WorkoutRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<Workouts />} />
            <Route path=":id" element={<WorkoutDetail />} />
        </Routes>
    );
};