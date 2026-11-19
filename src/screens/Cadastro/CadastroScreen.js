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

import { cadastrarUsuario } from '../../services/auth';


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


export default function CadastroScreen({ onEntrar }) {

    const [nome, setNome] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [confirmarSenha, setConfirmarSenha] = useState('');

    const [loading, setLoading] = useState(false);


    // Realizar cadastro
    async function handleCadastro() {

        if (
            !nome.trim() ||
            !username.trim() ||
            !email.trim() ||
            !senha ||
            !confirmarSenha
        ) {
            Alert.alert(
                'Campos obrigatórios',
                'Preencha todos os campos para continuar.'
            );

            return;
        }

        if (senha !== confirmarSenha) {
            Alert.alert(
                'Senhas diferentes',
                'As senhas informadas não coincidem.'
            );

            return;
        }

        if (senha.length < 6) {
            Alert.alert(
                'Senha muito curta',
                'Sua senha precisa ter pelo menos 6 caracteres.'
            );

            return;
        }

        if (username.trim().length < 3) {
            Alert.alert(
                'Nome de usuário inválido',
                'O nome de usuário precisa ter pelo menos 3 caracteres.'
            );

            return;
        }

        try {

            setLoading(true);

            const resultado = await cadastrarUsuario(
                email.trim(),
                senha,
                username.trim(),
                nome.trim()
            );

            Alert.alert(
                'Cadastro realizado!',
                resultado.message
            );

            setNome('');
            setUsername('');
            setEmail('');
            setSenha('');
            setConfirmarSenha('');

        } catch (error) {

            console.log('Erro no cadastro:', error);

            Alert.alert(
                'Não foi possível criar sua conta',
                error.message || 'Ocorreu um erro inesperado. Tente novamente.'
            );

        } finally {

            setLoading(false);

        }

    }


    return (

        <View style={styles.container}>

            <ScrollView
                contentContainerStyle={styles.conteudo}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >

                {/* Identidade visual */}

                <View style={styles.topo}>

                    <Text style={styles.logo}>
                        logo<Text style={styles.logoPonto}>.</Text>
                    </Text>

                    <View style={styles.linhaDecorativa} />

                    <Text style={styles.etiqueta}>
                        FAÇA PARTE DA COMUNIDADE
                    </Text>

                </View>


                {/* Introdução */}

                <View style={styles.introducao}>

                    <Text style={styles.titulo}>
                        Crie sua conta
                    </Text>

                    <Text style={styles.subtitulo}>
                        Um novo espaço para se conectar,
                        compartilhar ideias e descobrir pessoas.
                    </Text>

                </View>


                {/* Formulário */}

                <View style={styles.formulario}>

                    <Text style={styles.label}>
                        Nome completo
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Como podemos chamar você?"
                        placeholderTextColor={CORES.secundario}
                        value={nome}
                        onChangeText={setNome}
                        autoCapitalize="words"
                    />


                    <Text style={styles.label}>
                        Nome de usuário
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Escolha seu nome de usuário"
                        placeholderTextColor={CORES.secundario}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />


                    <Text style={styles.label}>
                        E-mail
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="seuemail@exemplo.com"
                        placeholderTextColor={CORES.secundario}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />


                    <Text style={styles.label}>
                        Senha
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Crie uma senha"
                        placeholderTextColor={CORES.secundario}
                        value={senha}
                        onChangeText={setSenha}
                        secureTextEntry
                    />


                    <Text style={styles.label}>
                        Confirmar senha
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Digite sua senha novamente"
                        placeholderTextColor={CORES.secundario}
                        value={confirmarSenha}
                        onChangeText={setConfirmarSenha}
                        secureTextEntry
                    />


                    {/* Botão de cadastro */}

                    <TouchableOpacity
                        style={[
                            styles.botao,
                            loading && styles.botaoDesabilitado
                        ]}
                        onPress={handleCadastro}
                        disabled={loading}
                        activeOpacity={0.85}
                    >

                        {loading ? (

                            <ActivityIndicator color="#FFFFFF" />

                        ) : (

                            <>

                                <Text style={styles.textoBotao}>
                                    Criar minha conta
                                </Text>

                                <Text style={styles.iconeBotao}>
                                    →
                                </Text>

                            </>

                        )}

                    </TouchableOpacity>

                </View>


                {/* Rodapé */}

                <View style={styles.footer}>

                    <Text style={styles.footerTexto}>
                        Já possui uma conta?
                    </Text>

                    <TouchableOpacity
                        onPress={onEntrar}
                        activeOpacity={0.7}
                    >

                        <Text style={styles.loginTexto}>
                            Entrar
                        </Text>

                    </TouchableOpacity>

                </View>


                <Text style={styles.rodapeFinal}>
                    CONECTE-SE. COMPARTILHE. DESCUBRA.
                </Text>

            </ScrollView>

        </View>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    conteudo: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 25,
        paddingTop: 45,
        paddingBottom: 35
    },

    // Identidade visual
    topo: {
        marginBottom: 32
    },

    logo: {
        fontSize: 42,
        fontWeight: '900',
        letterSpacing: -2,
        color: CORES.texto
    },

    logoPonto: {
        color: CORES.destaque
    },

    linhaDecorativa: {
        width: 43,
        height: 4,
        borderRadius: 5,
        backgroundColor: CORES.destaque,
        marginTop: 13,
        marginBottom: 17
    },

    etiqueta: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 2,
        color: CORES.destaque
    },

    // Introdução
    introducao: {
        marginBottom: 27
    },

    titulo: {
        fontSize: 30,
        fontWeight: '800',
        color: CORES.texto,
        letterSpacing: -0.7
    },

    subtitulo: {
        fontSize: 13,
        lineHeight: 21,
        color: CORES.secundario,
        marginTop: 9,
        maxWidth: 310
    },

    // Formulário
    formulario: {
        width: '100%'
    },

    label: {
        fontSize: 11,
        fontWeight: '700',
        color: CORES.texto,
        marginBottom: 8,
        marginLeft: 2
    },

    input: {
        height: 53,
        backgroundColor: CORES.cartao,
        borderRadius: 13,
        paddingHorizontal: 16,
        marginBottom: 17,
        fontSize: 13,
        color: CORES.texto,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    // Botão
    botao: {
        height: 55,
        backgroundColor: CORES.destaque,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 8,
        elevation: 3,
        shadowColor: CORES.destaque,
        shadowOffset: {
            width: 0,
            height: 3
        },
        shadowOpacity: 0.2,
        shadowRadius: 5
    },

    botaoDesabilitado: {
        opacity: 0.7
    },

    textoBotao: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    iconeBotao: {
        fontSize: 19,
        color: '#FFFFFF',
        marginLeft: 10
    },

    // Rodapé
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 29
    },

    footerTexto: {
        fontSize: 12,
        color: CORES.secundario
    },

    loginTexto: {
        fontSize: 12,
        fontWeight: '800',
        color: CORES.destaque,
        marginLeft: 5
    },

    rodapeFinal: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 2,
        color: '#625B6B',
        textAlign: 'center',
        marginTop: 38
    }

});