import { Link } from "react-router-dom";

export const NotFound = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center px-6 py-12">
                <h1 className="text-9xl font-extrabold text-primary">404</h1>
                <h2 className="text-3xl font-bold text-dark mt-4">Page Not Found</h2>
                <p className="text-gray-600 mt-4 max-w-md mx-auto">
                    The page you are looking for does not exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="inline-block mt-8 px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Back Home
                </Link>
            </div>
        </div>
    );
};
