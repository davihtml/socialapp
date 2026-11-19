import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';


// Registrar token de notificações do dispositivo
export async function registrarTokenPush() {

    try {

        console.log('[PUSH] Iniciando registro...');

        // Verificar se é um dispositivo físico
        if (!Device.isDevice) {
            console.log('[PUSH] Não é um dispositivo físico.');
            return null;
        }

        console.log('[PUSH] Dispositivo físico confirmado.');

        // Criar canal de notificações no Android
        if (Platform.OS === 'android') {

            await Notifications.setNotificationChannelAsync('default', {
                name: 'Notificações',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#B66AE8'
            });

            console.log('[PUSH] Canal Android configurado.');
        }

        // Buscar usuário autenticado
        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
            throw new Error('Usuário não autenticado.');
        }

        console.log('[PUSH] Usuário autenticado:', user.id);

        // Verificar permissões
        const { status: statusAtual } =
            await Notifications.getPermissionsAsync();

        console.log('[PUSH] Permissão atual:', statusAtual);

        let statusFinal = statusAtual;

        // Solicitar permissão se necessário
        if (statusAtual !== 'granted') {

            const { status } =
                await Notifications.requestPermissionsAsync();

            statusFinal = status;

            console.log('[PUSH] Resultado da solicitação:', statusFinal);
        }

        if (statusFinal !== 'granted') {
            console.log('[PUSH] Permissão não concedida.');
            return null;
        }

        console.log('[PUSH] Permissão concedida.');

        // Buscar ID do projeto EAS
        const projectId =
            Constants.easConfig?.projectId ||
            Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
            throw new Error('ID do projeto EAS não encontrado.');
        }

        console.log('[PUSH] Project ID encontrado:', projectId);

        // Gerar token Expo
        const { data: expoPushToken } =
            await Notifications.getExpoPushTokenAsync({
                projectId
            });

        if (!expoPushToken) {
            throw new Error('Não foi possível gerar o token Expo.');
        }

        console.log('[PUSH] Token gerado:', expoPushToken);

        // Salvar token no Supabase
        const { error } = await supabase
            .from('push_tokens')
            .upsert(
                {
                    user_id: user.id,
                    expo_push_token: expoPushToken,
                    device_type: Platform.OS,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'expo_push_token'
                }
            );

        if (error) throw error;

        console.log('[PUSH] Token registrado no Supabase!');

        return expoPushToken;

    } catch (error) {

        console.log('[PUSH] ERRO AO REGISTRAR TOKEN:');
        console.log(error?.message || error);
        console.log(error?.stack || '');

        return null;
    }
}


// Remover token push do dispositivo ao sair da conta
export async function removerTokenPush() {

    try {

        console.log('[PUSH] Iniciando remoção do token...');

        const {
            data: { user },
            error: userError
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        // Buscar ID do projeto EAS
        const projectId =
            Constants.easConfig?.projectId ||
            Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
            throw new Error('ID do projeto EAS não encontrado.');
        }

        // Recuperar token do dispositivo
        const { data: expoPushToken } =
            await Notifications.getExpoPushTokenAsync({
                projectId
            });

        if (!expoPushToken) {
            throw new Error('Não foi possível recuperar o token Expo.');
        }

        // Remover token do Supabase
        const { error } = await supabase
            .from('push_tokens')
            .delete()
            .eq('user_id', user.id)
            .eq('expo_push_token', expoPushToken);

        if (error) throw error;

        console.log('[PUSH] Token removido com sucesso.');

    } catch (error) {

        console.log('[PUSH] ERRO AO REMOVER TOKEN:');
        console.log(error?.message || error);

    }
}