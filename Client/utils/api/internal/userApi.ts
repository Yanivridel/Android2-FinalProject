// signup.ts
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseAuth } from '@/FirebaseConfig';
import { api } from './apiService';
import { IUser } from '@/types/userTypes';
import { IGroup } from '@/types/groupTypes';

export interface RegisterUserReq {
    email: string;
    pass: string;
    username: string;
}

interface RegisterUserRes {
    userId: string;
    user: IUser;
}

export const registerUser = async ({ email, pass, username }: RegisterUserReq): Promise<RegisterUserRes | null> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(FirebaseAuth, email, pass);
        const firebaseUid = userCredential.user.uid;
        console.log("REGISTER firebaseUid", firebaseUid);

        if (userCredential.user) {
            await sendEmailVerification(userCredential.user);
            console.log("Verification email sent to:", email);
        }
        
        const response = await api.post<RegisterUserRes>('api/users/register', {
            firebaseUid,
            email,
            username
        }, { skipAuth: true });
        
        console.log("Registration successful:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("Registration error:", error?.response?.data || error.message);
        return null;
    }
};

interface LoginUserReq {
    email: string;
    pass: string;
}

interface LoginUserRes extends IUser {
    user: IUser;
}

export const loginUser = async ({ email, pass }: LoginUserReq): Promise<IUser | null> => {
    try {
        // Firebase authentication
        const userCredential = await signInWithEmailAndPassword(FirebaseAuth, email, pass);
        
        // console.log("userCredential", userCredential);
        if (!userCredential.user.emailVerified) {
            console.warn("Email not verified.");
            // You can show a toast/snackbar here
            // return null; // RETURN LATER
        }

        // Get user data from your server
        const { data } = await api.get<LoginUserRes>('api/users/login');

        console.log("response data", data);
        
        console.log("Login successful:", data.user);
        return data.user;
    } catch (error: any) {
        console.error("Login error:", error?.response?.data || error.message);
        return null;
    }
};

export const logoutUser = async () => {
    await signOut(FirebaseAuth);
}

export const getUserById = async ({ userId }: { userId: string} ): Promise<IUser | null> => {
    const { data } = await api.get<IUser>(`api/users/${userId}`);
    return data;
}

export const getUserByEmail = async ({ userEmail }: { userEmail: string} ): Promise<IUser | null> => {
    const { data } = await api.get<{user: IUser}>(`api/users/email/${userEmail}`);
    return data.user;
}

interface getAutocompletePrefixRes {
    users: IUser[];
    groups: IGroup[];
}
export const getAutocompletePrefix = async ({ prefix }: { prefix: string} ): Promise<getAutocompletePrefixRes | null> => {
    const { data } = await api.get<getAutocompletePrefixRes>(`api/users/autocomplete/${prefix}`);
    return data;
}

export const updateUser = async (fields: Partial<IUser>): Promise<IUser | null> => {
	const { data } = await api.put<IUser>('api/users/', fields);
	return data;
};
