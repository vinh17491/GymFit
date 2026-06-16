interface IUser {
    id: number;
    email: string;
    fullName: string;
    role: string;
    photoURL?: string;
    displayName?: string;
}

interface IAuth {
    accessToken: string;
    refreshToken: string;
    user: IUser;
}

interface ILoginCredentials {
    email: string;
    password: string;
}

interface IRegisterCredentials extends ILoginCredentials {
    fullName: string;
}

interface IRegisterWithGoogleCredentials {
    credential: string;
}