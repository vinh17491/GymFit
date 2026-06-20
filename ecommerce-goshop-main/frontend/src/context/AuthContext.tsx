import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useRegisterMutation, useLoginMutation, useRegisterWithGoogleMutation } from "../features/auth";

interface Props {
    children: ReactNode;
}

interface IUser {
    id: number;
    email: string;
    fullName: string;
    role: string;
    photoURL?: string;
    displayName?: string;
}

interface IAuthContext {
  currentUser: IUser | null;
  isAdmin: boolean | undefined;
  isCoach: boolean | undefined;
  isMember: boolean | undefined;
  token: string;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: IRegisterCredentials) => Promise<void>;
  signInWithGoogle: (credential: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<IAuthContext>({
    currentUser: null,
    token: "",
    isAdmin: undefined,
    isCoach: undefined,
    isMember: undefined,
    isLoading: true,
    signIn: async () => {},
    signUp: async () => {},
    signInWithGoogle: async () => {},
    signOut: () => {}
});

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children } : Props) => {
    const [currentUser, setCurrentUser] = useState<IUser | null>(null);
    const [token, setToken] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAdmin, setIsAdmin] = useState<boolean>();
    const [isCoach, setIsCoach] = useState<boolean>();
    const [isMember, setIsMember] = useState<boolean>();

    const { mutateAsync: register } = useRegisterMutation();
    const { mutateAsync: login } = useLoginMutation();
    const { mutateAsync: registerWithGoogle } = useRegisterWithGoogleMutation();

    const setUserFromResponse = (data: IAuth) => {
        setToken(data.accessToken);
        setCurrentUser(data.user);
        setIsAdmin(data.user.role === "ADMIN");
        setIsCoach(data.user.role === "COACH");
        setIsMember(data.user.role === "MEMBER");
        // Store tokens in localStorage for persistence
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(data.user));
    };

    const signIn = async (email: string, password: string) => {
        const data = await login({ email, password });
        setUserFromResponse(data);
    };

    const signUp = async (data: IRegisterCredentials) => {
        const result = await register(data);
        setUserFromResponse(result);
    };

    const signInWithGoogle = async (credential: string) => {
        const data = await registerWithGoogle({ credential });
        setUserFromResponse(data);
    };

    const signOut = () => {
        setToken("");
        setCurrentUser(null);
        setIsAdmin(undefined);
        setIsCoach(undefined);
        setIsMember(undefined);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
    };

    useEffect(() => {
        // Restore session from localStorage on mount
        const storedToken = localStorage.getItem("accessToken");
        const storedUser = localStorage.getItem("user");
        if (storedToken && storedUser) {
            setToken(storedToken);
            setCurrentUser(JSON.parse(storedUser));
            const role = JSON.parse(storedUser).role;
            setIsAdmin(role === "ADMIN");
            setIsCoach(role === "COACH");
            setIsMember(role === "MEMBER");
        }
        setIsLoading(false);
    }, []);

    const value = {
        currentUser,
        isAdmin,
        isCoach,
        isMember,
        token,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut
    };

    return (
        <AuthContext.Provider value={value}>
            { !isLoading && children }
        </AuthContext.Provider>
    );
};