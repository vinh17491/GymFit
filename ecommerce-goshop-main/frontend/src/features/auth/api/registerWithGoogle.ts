import { useMutation } from "@tanstack/react-query";
import { api } from "../../../app/api";

const registerWithGoogle = (credentials: IRegisterWithGoogleCredentials): Promise<IAuth> => {
    return api.post("/auth/google", credentials).then(response => response.data);
};

export const useRegisterWithGoogleMutation = () => {
    return useMutation({
        mutationFn: (credentials: IRegisterWithGoogleCredentials) => registerWithGoogle(credentials)
    });
};
