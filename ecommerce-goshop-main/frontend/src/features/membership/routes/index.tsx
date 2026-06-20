import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Spinner } from "../../../components/Elements/Spinner";

const Membership = lazy(() => import("./Membership"));

export const MembershipRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<Suspense fallback={<Spinner />}><Membership /></Suspense>} />
        </Routes>
    );
};
