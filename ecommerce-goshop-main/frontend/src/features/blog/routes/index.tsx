import { Route, Routes } from "react-router-dom";
import BlogList from "./BlogList";
import BlogDetail from "./BlogDetail";

export const BlogRoutes = () => {
    return (
        <Routes>
            <Route path="" element={<BlogList />} />
            <Route path=":id" element={<BlogDetail />} />
        </Routes>
    );
};