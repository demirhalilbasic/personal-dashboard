import { Injectable, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.config';

export interface UserWeatherSettings {
  city: string;
  country?: string;
  latitude: number;
  longitude: number;
  temperatureUnit: 'celsius' | 'fahrenheit';
  windSpeedUnit: 'kmh' | 'mph' | 'ms';
}

export interface UserData {
  uid: string;
  email: string;
  ime: string;
  prezime: string;
  spol: 'musko' | 'zensko';
  datumRodjenja: string;
  selectedTheme: string;
  weatherSettings?: UserWeatherSettings;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private userData = signal<UserData | null>(null);
  private authReadyResolver: (() => void) | null = null;
  private authReady: Promise<void>;
  private userDataReadyResolver: (() => void) | null = null;
  private userDataReady: Promise<void>;

  constructor() {
    this.authReady = new Promise<void>((resolve) => {
      this.authReadyResolver = resolve;
    });

    this.userDataReady = new Promise<void>((resolve) => {
      this.userDataReadyResolver = resolve;
    });

    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser.set(user);
      if (user) {
        this.loadUserData(user.uid);
        this.updateLastLogin(user.uid);
      } else {
        this.userData.set(null);
        // reset and resolve immediately so waiters don't hang when nema sesije
        this.userDataReady = new Promise<void>((resolve) => {
          this.userDataReadyResolver = resolve;
        });
        if (this.userDataReadyResolver) {
          this.userDataReadyResolver();
          this.userDataReadyResolver = null;
        }
      }

      if (this.authReadyResolver) {
        this.authReadyResolver();
        this.authReadyResolver = null;
      }
    });
  }

  async waitForAuthReady(): Promise<void> {
    return this.authReady;
  }

  async waitForUserData(): Promise<void> {
    return this.userDataReady;
  }

  getCurrentUser() {
    return this.currentUser();
  }

  getUserData() {
    return this.userData();
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  async register(
    email: string,
    password: string,
    ime: string,
    prezime: string,
    spol: 'musko' | 'zensko',
    datumRodjenja: string,
    selectedTheme: string
  ): Promise<void> {
    // Validate email domain
    if (!email.endsWith('@ipi-akademija.ba')) {
      throw new Error('Email mora biti sa @ipi-akademija.ba domene');
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore
      const userData: UserData = {
        uid: user.uid,
        email: user.email!,
        ime,
        prezime,
        spol,
        datumRodjenja,
        selectedTheme,
        weatherSettings: {
          city: 'Tuzla',
          country: 'Bosna i Hercegovina',
          latitude: 44.5384,
          longitude: 18.6763,
          temperatureUnit: 'celsius',
          windSpeedUnit: 'kmh',
        },
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      this.userData.set(userData);
      if (this.userDataReadyResolver) {
        this.userDataReadyResolver();
        this.userDataReadyResolver = null;
      }
    } catch (error: any) {
      throw new Error(this.translateFirebaseError(error.code));
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await this.updateLastLogin(userCredential.user.uid);
    } catch (error: any) {
      throw new Error(this.translateFirebaseError(error.code));
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.userData.set(null);
    } catch (error: any) {
      throw new Error('Greška pri odjavi');
    }
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        // Default to 'musko' if spol is not set (for existing users)
        if (!data.spol) {
          data.spol = 'musko';
        }
        this.userData.set(data);
      } else {
        this.userData.set(null);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.userData.set(null);
    } finally {
      // Always resolve so UI doesn't hang if Firestore is slow/offline
      if (this.userDataReadyResolver) {
        this.userDataReadyResolver();
        this.userDataReadyResolver = null;
      }
    }
  }

  private async updateLastLogin(uid: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async updateUserTheme(uid: string, themeId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'users', uid), {
        selectedTheme: themeId,
      });

      // Update local user data
      const currentData = this.userData();
      if (currentData) {
        this.userData.set({ ...currentData, selectedTheme: themeId });
        if (this.userDataReadyResolver) {
          this.userDataReadyResolver();
          this.userDataReadyResolver = null;
        }
      }
    } catch (error) {
      throw new Error('Greška pri ažuriranju teme');
    }
  }

  private translateFirebaseError(errorCode: string): string {
    const errorMessages: { [key: string]: string } = {
      'auth/email-already-in-use': 'Ovaj email je već registrovan',
      'auth/invalid-email': 'Neispravan email format',
      'auth/operation-not-allowed': 'Operacija nije dozvoljena',
      'auth/weak-password': 'Lozinka je preslaba',
      'auth/user-disabled': 'Korisnički račun je onemogućen',
      'auth/user-not-found': 'Neispravni korisnički podaci',
      'auth/wrong-password': 'Neispravni korisnički podaci',
      'auth/invalid-credential': 'Neispravni korisnički podaci',
      'auth/too-many-requests': 'Previše pokušaja. Molimo pokušajte kasnije',
    };

    return errorMessages[errorCode] || 'Došlo je do greške. Molimo pokušajte ponovo.';
  }
}
