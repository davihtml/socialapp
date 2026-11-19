import { supabase } from './supabase';
import * as Linking from 'expo-linking';

export async function cadastrarUsuario(email, senha, username, nome) {

    const redirectTo = Linking.createURL('login-callback');
    console.log('URL DE REDIRECIONAMENTO:', redirectTo);

    const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,

        options: {
            emailRedirectTo: redirectTo,

            data: {
                username: username.trim().toLowerCase(),
                full_name: nome.trim()
            }
        }
    });

    if (error) {
        throw error;
    }

    if (!data.user) {
        throw new Error('Não foi possível criar o usuário.');
    }

    if (!data.session) {
        return {
            user: data.user,
            message: 'Verifique seu e-mail para confirmar o cadastro.'
        };
    }

    return {
        user: data.user,
        message: 'Cadastro realizado com sucesso!'
    };
}

export async function loginUsuario(email, senha) {

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        throw error;
    }

    return data.user;
}

export async function logoutUsuario() {

    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }
}