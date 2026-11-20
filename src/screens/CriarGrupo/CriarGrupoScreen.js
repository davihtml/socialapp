import React, { useEffect, useRef, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Image,
    ActivityIndicator,
    Alert,
    Keyboard
} from 'react-native';

import { pesquisarUsuarios } from '../../services/profiles';

import {
    criarGrupo,
    adicionarParticipante
} from '../../services/groupChat';

import { supabase } from '../../services/supabase';


const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    secundarioCard: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431'
};


export default function CriarGrupoScreen({
    onVoltar,
    onGrupoCriado
}) {

    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');

    const [termo, setTermo] = useState('');
    const [resultados, setResultados] = useState([]);

    const [selecionados, setSelecionados] = useState([]);

    const [usuarioId, setUsuarioId] = useState(null);

    const [pesquisando, setPesquisando] = useState(false);
    const [criando, setCriando] = useState(false);

    const temporizador = useRef(null);
    const requisicaoAtual = useRef(0);


    // Buscar usuário autenticado
    useEffect(() => {

        async function carregarUsuario() {

            try {

                const {
                    data: { user },
                    error
                } = await supabase.auth.getUser();

                if (error) throw error;

                setUsuarioId(user?.id || null);

            } catch (error) {

                console.log('Erro ao buscar usuário:', error);

            }

        }

        carregarUsuario();

    }, []);


    // Pesquisa de usuários
    useEffect(() => {

        clearTimeout(temporizador.current);

        const busca = termo.trim().replace(/^@/, '');

        if (!busca) {

            requisicaoAtual.current++;

            setResultados([]);
            setPesquisando(false);

            return;

        }

        const numeroRequisicao = ++requisicaoAtual.current;

        temporizador.current = setTimeout(async () => {

            try {

                setPesquisando(true);

                const usuarios = await pesquisarUsuarios(busca);

                if (numeroRequisicao !== requisicaoAtual.current) {
                    return;
                }

                setResultados(
                    usuarios.filter(usuario =>
                        usuario.id !== usuarioId
                    )
                );

            } catch (error) {

                console.log('Erro ao pesquisar usuários:', error);

                if (numeroRequisicao === requisicaoAtual.current) {
                    setResultados([]);
                }

            } finally {

                if (numeroRequisicao === requisicaoAtual.current) {
                    setPesquisando(false);
                }

            }

        }, 400);

        return () => clearTimeout(temporizador.current);

    }, [termo, usuarioId]);


    // Selecionar ou remover usuário
    function alternarParticipante(usuario) {

        const jaSelecionado = selecionados.some(
            item => item.id === usuario.id
        );

        if (jaSelecionado) {

            setSelecionados(prev =>
                prev.filter(item => item.id !== usuario.id)
            );

        } else {

            setSelecionados(prev => [
                ...prev,
                usuario
            ]);

        }

    }


    // Criar grupo
    async function handleCriarGrupo() {

        Keyboard.dismiss();

        if (!nome.trim()) {

            Alert.alert(
                'Nome obrigatório',
                'Informe um nome para o grupo.'
            );

            return;

        }

        if (criando) return;

        try {

            setCriando(true);

            // Criar grupo e adicionar criador como administrador
            const grupo = await criarGrupo(
                nome,
                descricao
            );

            let falhas = 0;

            // Adicionar participantes selecionados
            for (const usuario of selecionados) {

                try {

                    await adicionarParticipante(
                        grupo.id,
                        usuario.id
                    );

                } catch (error) {

                    falhas++;

                    console.log(
                        `Erro ao adicionar ${usuario.username}:`,
                        error
                    );

                }

            }

            if (falhas > 0) {

                Alert.alert(
                    'Grupo criado',
                    `O grupo foi criado, mas ${falhas} participante(s) não puderam ser adicionados.`
                );

            }

            onGrupoCriado?.(grupo);

        } catch (error) {

            console.log('Erro ao criar grupo:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível criar o grupo.'
            );

        } finally {

            setCriando(false);

        }

    }


    // Avatar
    function renderAvatar(usuario, tamanho = 45) {

        return (

            <View
                style={[
                    styles.avatar,
                    {
                        width: tamanho,
                        height: tamanho,
                        borderRadius: tamanho / 2
                    }
                ]}
            >

                {usuario.avatar_url ? (

                    <Image
                        source={{ uri: usuario.avatar_url }}
                        style={styles.avatarImagem}
                    />

                ) : (

                    <Text style={styles.avatarTexto}>
                        {(usuario.full_name || usuario.username || 'U')
                            .charAt(0)
                            .toUpperCase()}
                    </Text>

                )}

            </View>

        );

    }


    // Resultado da pesquisa
    function renderUsuario({ item }) {

        const selecionado = selecionados.some(
            usuario => usuario.id === item.id
        );

        return (

            <TouchableOpacity
                style={styles.usuario}
                onPress={() => alternarParticipante(item)}
                activeOpacity={0.7}
            >

                {renderAvatar(item)}

                <View style={styles.informacoes}>

                    <Text style={styles.nomeUsuario}>
                        {item.full_name || 'Usuário'}
                    </Text>

                    <Text style={styles.username}>
                        @{item.username || 'usuario'}
                    </Text>

                </View>

                <View style={[
                    styles.seletor,
                    selecionado && styles.seletorAtivo
                ]}>

                    {selecionado && (

                        <Text style={styles.check}>
                            ✓
                        </Text>

                    )}

                </View>

            </TouchableOpacity>

        );

    }


    return (

        <View style={styles.container}>

            {/* CABEÇALHO */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={onVoltar}
                    disabled={criando}
                >

                    <Text style={styles.iconeVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>

                <View style={styles.headerInfo}>

                    <Text style={styles.titulo}>
                        Novo grupo
                    </Text>

                    <Text style={styles.subtitulo}>
                        Crie um espaço para conversar.
                    </Text>

                </View>

            </View>


            <FlatList
                data={resultados}
                keyExtractor={item => item.id}
                renderItem={renderUsuario}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}

                contentContainerStyle={styles.lista}

                ListHeaderComponent={

                    <View>

                        {/* INFORMAÇÕES DO GRUPO */}

                        <View style={styles.secao}>

                            <Text style={styles.label}>
                                NOME DO GRUPO
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Amigos, Família..."
                                placeholderTextColor={CORES.secundario}
                                value={nome}
                                onChangeText={setNome}
                                maxLength={40}
                            />

                            <Text style={styles.label}>
                                DESCRIÇÃO (OPCIONAL)
                            </Text>

                            <TextInput
                                style={[
                                    styles.input,
                                    styles.inputDescricao
                                ]}
                                placeholder="Sobre o que é este grupo?"
                                placeholderTextColor={CORES.secundario}
                                value={descricao}
                                onChangeText={setDescricao}
                                multiline
                                maxLength={150}
                            />

                        </View>


                        {/* PARTICIPANTES SELECIONADOS */}

                        <View style={styles.secao}>

                            <View style={styles.tituloLinha}>

                                <Text style={styles.label}>
                                    PARTICIPANTES
                                </Text>

                                <Text style={styles.quantidade}>
                                    {selecionados.length} selecionados
                                </Text>

                            </View>


                            {selecionados.length > 0 ? (

                                <View style={styles.selecionados}>

                                    {selecionados.map(usuario => (

                                        <TouchableOpacity
                                            key={usuario.id}
                                            style={styles.participante}
                                            onPress={() =>
                                                alternarParticipante(usuario)
                                            }
                                        >

                                            {renderAvatar(usuario, 48)}

                                            <Text
                                                style={styles.nomeParticipante}
                                                numberOfLines={1}
                                            >
                                                {usuario.username || 'Usuário'}
                                            </Text>

                                            <View style={styles.removerParticipante}>
                                                <Text style={styles.removerTexto}>
                                                    ×
                                                </Text>
                                            </View>

                                        </TouchableOpacity>

                                    ))}

                                </View>

                            ) : (

                                <Text style={styles.semSelecionados}>
                                    Você ainda não selecionou participantes.
                                </Text>

                            )}

                        </View>


                        {/* PESQUISA */}

                        <View style={styles.secaoPesquisa}>

                            <Text style={styles.label}>
                                ADICIONAR PESSOAS
                            </Text>

                            <View style={styles.campoPesquisa}>

                                <Text style={styles.iconePesquisa}>
                                    ⌕
                                </Text>

                                <TextInput
                                    style={styles.inputPesquisa}
                                    placeholder="Pesquisar nome ou @username"
                                    placeholderTextColor={CORES.secundario}
                                    value={termo}
                                    onChangeText={setTermo}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />

                                {pesquisando && (

                                    <ActivityIndicator
                                        size="small"
                                        color={CORES.destaque}
                                    />

                                )}

                            </View>

                        </View>

                    </View>

                }

                ListEmptyComponent={() => {

                    if (pesquisando || !termo.trim()) {
                        return null;
                    }

                    return (

                        <Text style={styles.semResultados}>
                            Nenhum usuário encontrado.
                        </Text>

                    );

                }}

                ListFooterComponent={

                    <View style={styles.rodape}>

                        <TouchableOpacity
                            style={[
                                styles.botaoCriar,
                                (criando || !nome.trim()) &&
                                styles.botaoDesabilitado
                            ]}
                            onPress={handleCriarGrupo}
                            disabled={criando || !nome.trim()}
                            activeOpacity={0.8}
                        >

                            {criando ? (

                                <ActivityIndicator
                                    color={CORES.fundo}
                                />

                            ) : (

                                <Text style={styles.textoBotao}>
                                    Criar grupo
                                </Text>

                            )}

                        </TouchableOpacity>

                    </View>

                }

            />

        </View>

    );

}


// =====================================
// ESTILOS
// =====================================

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    header: {
        height: 75,
        paddingHorizontal: 18,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: CORES.card,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 32,
        color: CORES.texto,
        lineHeight: 36
    },

    headerInfo: {
        marginLeft: 13
    },

    titulo: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '700'
    },

    subtitulo: {
        color: CORES.secundario,
        fontSize: 11,
        marginTop: 3
    },

    lista: {
        paddingHorizontal: 18,
        paddingBottom: 35,
        flexGrow: 1
    },

    secao: {
        marginTop: 23
    },

    label: {
        color: CORES.secundario,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 11
    },

    input: {
        minHeight: 50,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 14,
        paddingHorizontal: 15,
        color: CORES.texto,
        fontSize: 13,
        marginBottom: 19
    },

    inputDescricao: {
        minHeight: 85,
        paddingTop: 13,
        textAlignVertical: 'top'
    },

    tituloLinha: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },

    quantidade: {
        color: CORES.destaque,
        fontSize: 11,
        marginBottom: 11
    },

    selecionados: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15
    },

    participante: {
        width: 65,
        alignItems: 'center',
        position: 'relative'
    },

    nomeParticipante: {
        color: CORES.secundario,
        fontSize: 10,
        marginTop: 6,
        maxWidth: 65
    },

    removerParticipante: {
        position: 'absolute',
        top: -4,
        right: 3,
        width: 19,
        height: 19,
        borderRadius: 10,
        backgroundColor: CORES.destaque,
        alignItems: 'center',
        justifyContent: 'center'
    },

    removerTexto: {
        color: CORES.fundo,
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 19
    },

    semSelecionados: {
        color: CORES.secundario,
        fontSize: 12,
        marginBottom: 5
    },

    secaoPesquisa: {
        marginTop: 27
    },

    campoPesquisa: {
        height: 49,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 14,
        paddingHorizontal: 13
    },

    iconePesquisa: {
        color: CORES.destaque,
        fontSize: 24,
        marginRight: 9
    },

    inputPesquisa: {
        flex: 1,
        color: CORES.texto,
        fontSize: 12,
        height: '100%'
    },

    usuario: {
        minHeight: 70,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 11,
        marginTop: 8,
        backgroundColor: CORES.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatar: {
        backgroundColor: CORES.secundarioCard,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: CORES.borda
    },

    avatarImagem: {
        width: '100%',
        height: '100%'
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 18,
        fontWeight: '700'
    },

    informacoes: {
        flex: 1,
        marginLeft: 12
    },

    nomeUsuario: {
        color: CORES.texto,
        fontSize: 13,
        fontWeight: '700'
    },

    username: {
        color: CORES.secundario,
        fontSize: 11,
        marginTop: 4
    },

    seletor: {
        width: 23,
        height: 23,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: CORES.secundario,
        alignItems: 'center',
        justifyContent: 'center'
    },

    seletorAtivo: {
        backgroundColor: CORES.destaque,
        borderColor: CORES.destaque
    },

    check: {
        color: CORES.fundo,
        fontSize: 14,
        fontWeight: '900'
    },

    semResultados: {
        color: CORES.secundario,
        textAlign: 'center',
        fontSize: 12,
        paddingVertical: 25
    },

    rodape: {
        marginTop: 28,
        marginBottom: 25
    },

    botaoCriar: {
        height: 52,
        backgroundColor: CORES.destaque,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },

    botaoDesabilitado: {
        opacity: 0.45
    },

    textoBotao: {
        color: CORES.fundo,
        fontSize: 14,
        fontWeight: '800'
    }

});