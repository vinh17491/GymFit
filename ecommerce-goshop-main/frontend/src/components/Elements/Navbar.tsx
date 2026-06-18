import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { MdDashboard, MdNotifications } from "react-icons/md";
import { IoFitness } from "react-icons/io5";
import defaultAvatar from "../../assets/images/default-avatar.webp";

const Navbar = () => {
    const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

    const { signOut, currentUser, isAdmin, isCoach } = useAuth();
    const navigate = useNavigate();

    const handleNavClick = () => {
        setDropdownOpen(prevState => !prevState);
    };

    const handleSignOut = () => {
        signOut();
        navigate("/auth/login");
    };

    const getDashboardLink = () => {
        if (isAdmin) return "/admin/dashboard";
        if (isCoach) return "/coach/dashboard";
        return "/dashboard";
    };

    return (
        <div className="bg-gray-900 px-2 xs:px-6 py-5 justify-between rounded-xl items-center my-4 drop-shadow-lg relative z-30">
            <ul className="flex items-center text-sm justify-between">
                <li className="font-bold text-white text-xl flex items-center gap-2">
                    <IoFitness className="text-green-400" />
                    <Link to="/">GymFit</Link>
                </li>
                <div className="flex text-gray-300 text-lg items-center">
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/membership">Membership</Link>
                    </li>
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/coaches">Coaches</Link>
                    </li>
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/workouts">Workouts</Link>
                    </li>
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/diet">Diet</Link>
                    </li>
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/blogs">Blog</Link>
                    </li>
                    <li className="transition-colors hover:text-white ml-4">
                        <Link to="/health">Health Tools</Link>
                    </li>
                    {currentUser && (
                        <>
                            <li className="transition-colors hover:text-white ml-4">
                                <Link to="/notifications">
                                    <MdNotifications />
                                </Link>
                            </li>
                            <li className="transition-colors hover:text-white ml-4">
                                <Link to={getDashboardLink()}>
                                    <MdDashboard />
                                </Link>
                            </li>
                        </>
                    )}
                    <li className="font-medium text-sm text-gray-300 relative ml-5">
                        <button className="flex items-center" onClick={handleNavClick}>
                            <span className="sr-only">Account</span>
                            <img className="w-8 h-8 rounded-full" src={currentUser?.photoURL || defaultAvatar} alt="User avatar" />
                            <FaChevronDown className="ml-1 text-gray-400" />
                        </button>

                        {dropdownOpen && (
                            <div className="z-10 transform animate-dropdown origin-top-right absolute mb-10 mt-4 right-0 bg-white divide-y divide-gray-100 rounded-lg shadow w-44">
                                {currentUser &&
                                <div className="px-4 py-3 text-sm text-gray-900">
                                    <div>{currentUser?.displayName || currentUser?.fullName}</div>
                                    <div className="font-medium truncate">
                                        {currentUser?.email}
                                    </div>
                                </div>
                                }
                                <ul className="py-2 text-sm text-gray-700">
                                    <li>
                                        <Link
                                            to={getDashboardLink()}
                                            className="block px-4 py-2 hover:bg-gray-100"
                                        >
                        Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            to={getDashboardLink()}
                                            state={{ destination: "profile" }}
                                            className="block px-4 py-2 hover:bg-gray-100"
                                        >
                        Settings
                                        </Link>
                                    </li>
                                </ul>
                                <div className="py-2">
                                    <button
                                        onClick={handleSignOut}
                                        className="px-4 py-2 text-left hover:bg-gray-100 w-full text-sm text-gray-900"
                                    >
                      Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </li>
                </div>
            </ul>
        </div>
    );
};

export default Navbar;