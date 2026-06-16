interface IUser {
    id: number;
    email: string;
    fullName: string;
    role: "USER" | "ADMIN";
    avatar?: string | Blob;
    photoURL?: string;
    displayName?: string;
}