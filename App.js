import React, { useEffect, useState } from 'react';

import {
    View,
    ActivityIndicator,
    StyleSheet
} from 'react-native';

import {
    SafeAreaProvider,
    SafeAreaView
} from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';

import CadastroScreen from './src/screens/Cadastro/CadastroScreen';
import LoginScreen from './src/screens/Login/LoginScreen';
import HomeScreen from './src/screens/Home/HomeScreen';

import * as Linking from 'expo-linking';

import { supabase } from './src/services/supabase';
import { registrarTokenPush } from './src/services/pushTokens';


function Navegacao() {

    const { user, loading } = useAuth();

    const [tela, setTela] = useState('login');

    // Atualizar tela conforme autenticação
    useEffect(() => {

        if (user) {
            setTela('home');
        } else {
            setTela('login');
        }

    }, [user]);

    // Registrar token de notificações do dispositivo
    useEffect(() => {

        if (loading || !user?.id) return;

        registrarTokenPush();

    }, [user?.id, loading]);

    if (loading) {

        return (
            <View style={styles.loading}>
                <ActivityIndicator
                    size="large"
                    color="#6C5CE7"
                />
            </View>

        );

    }

    if (user) {
        return <HomeScreen />;
    }

    if (tela === 'cadastro') {
        return (
            <CadastroScreen
                onEntrar={() => setTela('login')}
            />
        );
    }

    return (
        <LoginScreen
            onCriarConta={() => setTela('cadastro')}
        />
    );

}


export default function App() {

    useEffect(() => {

        async function tratarLink(url) {

            if (!url) return;

            const { queryParams } = Linking.parse(url);

            const code = queryParams?.code;

            if (code) {

                const { error } =
                    await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                    console.log(
                        'Erro ao confirmar e-mail:',
                        error.message
                    );
                } else {
                    console.log('E-mail confirmado com sucesso!');
                }

            }

        }

        Linking.getInitialURL().then(tratarLink);

        const subscription = Linking.addEventListener(
            'url',
            ({ url }) => tratarLink(url)
        );

        return () => subscription.remove();

    }, []);

    return (
        <SafeAreaProvider>
            <SafeAreaView
                style={styles.container}
                edges={['top', 'bottom']}
            >
                <AuthProvider>
                    <Navegacao />
                </AuthProvider>
            </SafeAreaView>
        </SafeAreaProvider>
    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: '#FFFFFF'
    },

    loading: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center'
    }

});