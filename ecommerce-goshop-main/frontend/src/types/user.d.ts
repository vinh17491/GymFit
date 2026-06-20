interface IUser {
    id: number;
    email: string;
    fullName: string;
    role: string;
    avatar?: string | Blob;
    photoURL?: string;
    displayName?: string;
}