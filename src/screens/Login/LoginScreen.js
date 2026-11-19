import React, { useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';

import { loginUsuario } from '../../services/auth';


const CORES = {
    fundo: '#0B0910',
    cartao: '#17141E',
    cartaoSecundario: '#211B2B',
    destaque: '#B66AE8',
    destaqueEscuro: '#8F4FC0',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431'
};


export default function LoginScreen({ onCriarConta }) {

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');

    const [loading, setLoading] = useState(false);


    // Realizar login
    async function handleLogin() {

        if (!email.trim() || !senha) {

            Alert.alert(
                'Atenção',
                'Preencha todos os campos.'
            );

            return;

        }

        try {

            setLoading(true);

            await loginUsuario(email.trim(), senha);

        } catch (error) {

            Alert.alert(
                'Erro ao entrar',
                error.message || 'Não foi possível realizar o login.'
            );

        } finally {

            setLoading(false);

        }

    }


    return (

        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >

            <View style={styles.content}>

                {/* Logo */}

                <View style={styles.logoContainer}>

                    <View style={styles.logoDetalhe} />

                    <Text style={styles.logo}>
                        logo
                    </Text>

                </View>


                {/* Introdução */}

                <View style={styles.introducao}>

                    <Text style={styles.title}>
                        Bem-vindo de volta!
                    </Text>

                    <Text style={styles.subtitle}>
                        Entre na sua conta para continuar conectado à comunidade.
                    </Text>

                </View>


                {/* Formulário */}

                <View style={styles.formulario}>

                    {/* E-mail */}

                    <View style={styles.campo}>

                        <Text style={styles.label}>
                            ENDEREÇO DE E-MAIL
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Digite seu e-mail"
                            placeholderTextColor={CORES.secundario}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />

                    </View>


                    {/* Senha */}

                    <View style={styles.campo}>

                        <Text style={styles.label}>
                            SENHA
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Digite sua senha"
                            placeholderTextColor={CORES.secundario}
                            value={senha}
                            onChangeText={setSenha}
                            secureTextEntry
                        />

                    </View>


                    {/* Botão entrar */}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled
                        ]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >

                        {loading ? (

                            <ActivityIndicator color="#FFFFFF" />

                        ) : (

                            <>

                                <Text style={styles.buttonText}>
                                    Entrar
                                </Text>

                                <Text style={styles.buttonArrow}>
                                    →
                                </Text>

                            </>

                        )}

                    </TouchableOpacity>

                </View>


                {/* Cadastro */}

                <View style={styles.footer}>

                    <Text style={styles.footerText}>
                        Ainda não possui uma conta?
                    </Text>

                    <TouchableOpacity
                        onPress={onCriarConta}
                        disabled={loading}
                    >

                        <Text style={styles.registerText}>
                            {' '}Criar conta
                        </Text>

                    </TouchableOpacity>

                </View>


                {/* Rodapé */}

                <View style={styles.rodape}>

                    <View style={styles.linha} />

                    <Text style={styles.tagline}>
                        CONECTE-SE. COMPARTILHE. DESCUBRA.
                    </Text>

                </View>

            </View>

        </ScrollView>

    );

}


// Estilos
const styles = StyleSheet.create({

    container: {
        flexGrow: 1,
        backgroundColor: CORES.fundo,
        justifyContent: 'center',
        paddingHorizontal: 26,
        paddingVertical: 45
    },

    content: {
        width: '100%'
    },


    // Logo
    logoContainer: {
        alignItems: 'flex-start',
        marginBottom: 55
    },

    logoDetalhe: {
        width: 34,
        height: 4,
        borderRadius: 5,
        backgroundColor: CORES.destaque,
        marginBottom: 10
    },

    logo: {
        fontSize: 43,
        fontWeight: '800',
        color: CORES.texto,
        letterSpacing: -2
    },


    // Introdução
    introducao: {
        marginBottom: 35
    },

    title: {
        fontSize: 28,
        fontWeight: '800',
        color: CORES.texto,
        letterSpacing: -0.7
    },

    subtitle: {
        fontSize: 14,
        color: CORES.secundario,
        marginTop: 10,
        lineHeight: 22
    },


    // Formulário
    formulario: {
        backgroundColor: CORES.cartao,
        borderRadius: 20,
        padding: 19,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    campo: {
        marginBottom: 23
    },

    label: {
        color: CORES.secundario,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 10,
        marginLeft: 2
    },

    input: {
        height: 54,
        backgroundColor: CORES.cartaoSecundario,
        borderRadius: 13,
        paddingHorizontal: 16,
        fontSize: 14,
        color: CORES.texto,
        borderWidth: 1,
        borderColor: CORES.borda
    },


    // Botão
    button: {
        height: 55,
        backgroundColor: CORES.destaque,
        borderRadius: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5
    },

    buttonDisabled: {
        opacity: 0.6
    },

    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },

    buttonArrow: {
        color: '#FFFFFF',
        fontSize: 21,
        fontWeight: '700',
        marginLeft: 10
    },


    // Cadastro
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30
    },

    footerText: {
        color: CORES.secundario,
        fontSize: 13
    },

    registerText: {
        color: CORES.destaque,
        fontWeight: '800',
        fontSize: 13
    },


    // Rodapé
    rodape: {
        alignItems: 'center',
        marginTop: 65
    },

    linha: {
        width: 35,
        height: 2,
        borderRadius: 5,
        backgroundColor: CORES.borda,
        marginBottom: 17
    },

    tagline: {
        color: '#625B6B',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        textAlign: 'center'
    }

});