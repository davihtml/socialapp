import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    TextInput
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import {
    buscarPerfil,
    buscarPublicacoesUsuario
} from '../../services/profiles';

import {
    verificarSeSegue,
    seguirUsuario,
    deixarDeSeguirUsuario,
    buscarEstatisticasSeguidores
} from '../../services/follows';

import {
    registrarVisitaPerfil
} from '../../services/notifications';

import {
    bloquearUsuario,
    desbloquearUsuario,
    verificarSeBloqueou,
    verificarBloqueioMutuo,
    denunciarUsuario
} from '../../services/blocks';

import { atualizarAvatar } from '../../services/avatars';
import { logoutUsuario } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';


const CORES = {
    fundo: '#0B0910',
    card: '#17141E',
    cardSecundario: '#211B2B',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#292431',
    vermelho: '#D96B87'
};


export default function PerfilScreen({
    userId,
    onVoltar,
    onEditar,
    onMensagem,
    onAbrirSalvos
}) {

    const { user } = useAuth();

    const [perfil, setPerfil] = useState(null);
    const [publicacoes, setPublicacoes] = useState([]);

    const [loading, setLoading] = useState(true);
    const [enviandoFoto, setEnviandoFoto] = useState(false);

    const [segueUsuario, setSegueUsuario] = useState(false);
    const [alterandoSeguidor, setAlterandoSeguidor] = useState(false);

    const [bloqueouUsuario, setBloqueouUsuario] = useState(false);
    const [perfilBloqueado, setPerfilBloqueado] = useState(false);

    const [modalDenuncia, setModalDenuncia] = useState(false);
    const [motivoDenuncia, setMotivoDenuncia] = useState('');
    const [detalhesDenuncia, setDetalhesDenuncia] = useState('');
    const [enviandoDenuncia, setEnviandoDenuncia] = useState(false);

    const [estatisticasSeguidores, setEstatisticasSeguidores] = useState({
        seguidores: 0,
        seguindo: 0
    });

    const meuPerfil = user?.id === userId;


    // Registrar visita ao perfil de outro usuário
    useEffect(() => {

        async function registrarVisita() {

            if (!user?.id || !userId) return;

            if (user.id === userId) return;

            try {

                const bloqueio = await verificarBloqueioMutuo(userId);

                if (bloqueio) return;

                await registrarVisitaPerfil(userId);

            } catch (error) {

                console.log(
                    'Erro ao registrar visita ao perfil:',
                    error
                );

            }

        }

        registrarVisita();

    }, [user?.id, userId]);


    // Carregar perfil, publicações e seguidores
    async function carregarPerfil() {

        try {

            setLoading(true);
            setPerfilBloqueado(false);

            // Verificar se existe bloqueio entre os usuários
            if (!meuPerfil) {

                const bloqueio = await verificarBloqueioMutuo(userId);

                if (bloqueio) {

                    setPerfilBloqueado(true);
                    setPerfil(null);
                    setPublicacoes([]);

                    return;

                }

            }

            console.log('1 - Buscando perfil...');

            const dadosPerfil = await buscarPerfil(userId);

            console.log('1 - Perfil carregado:', dadosPerfil);

            if (!dadosPerfil) {

                setPerfil(null);
                setPublicacoes([]);

                return;

            }

            setPerfil(dadosPerfil);


            console.log('2 - Buscando publicações...');

            const dadosPublicacoes = await buscarPublicacoesUsuario(userId);

            console.log('2 - Publicações carregadas:', dadosPublicacoes);

            setPublicacoes(dadosPublicacoes || []);


            console.log('3 - Buscando estatísticas...');

            try {

                const estatisticas = await buscarEstatisticasSeguidores(userId);

                console.log('3 - Estatísticas carregadas:', estatisticas);

                setEstatisticasSeguidores(estatisticas);

            } catch (error) {

                console.log('ERRO NAS ESTATÍSTICAS:', error);

                setEstatisticasSeguidores({
                    seguidores: 0,
                    seguindo: 0
                });

            }


            if (!meuPerfil) {

                console.log('4 - Verificando relacionamento...');

                try {

                    const seguindo = await verificarSeSegue(userId);

                    console.log('4 - Relacionamento carregado:', seguindo);

                    setSegueUsuario(seguindo);

                } catch (error) {

                    console.log('ERRO AO VERIFICAR RELACIONAMENTO:', error);

                    setSegueUsuario(false);

                }


                // Verificar se o usuário atual bloqueou este perfil
                try {

                    const bloqueado = await verificarSeBloqueou(userId);

                    setBloqueouUsuario(bloqueado);

                } catch (error) {

                    console.log('Erro ao verificar bloqueio:', error);

                    setBloqueouUsuario(false);

                }

            } else {

                setBloqueouUsuario(false);

            }

        } catch (error) {

            console.log('ERRO NO CARREGAMENTO:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar o perfil.'
            );

        } finally {

            setLoading(false);

        }

    }


    // Atualizar perfil ao mudar o usuário
    useEffect(() => {

        carregarPerfil();

    }, [userId]);


    // Seguir ou deixar de seguir
    async function handleAlternarSeguidor() {

        if (alterandoSeguidor) return;

        try {

            setAlterandoSeguidor(true);

            if (segueUsuario) {

                await deixarDeSeguirUsuario(userId);

                setSegueUsuario(false);

                setEstatisticasSeguidores(atual => ({
                    ...atual,
                    seguidores: Math.max(0, atual.seguidores - 1)
                }));

            } else {

                await seguirUsuario(userId);

                setSegueUsuario(true);

                setEstatisticasSeguidores(atual => ({
                    ...atual,
                    seguidores: atual.seguidores + 1
                }));

            }

        } catch (error) {

            console.log('Erro ao alterar seguidor:', error);

            Alert.alert(
                'Erro',
                'Não foi possível realizar essa ação.'
            );

        } finally {

            setAlterandoSeguidor(false);

        }

    }


    // Abrir opções de segurança
    function handleOpcoesSeguranca() {

        Alert.alert(
            'Opções do perfil',
            `O que deseja fazer com @${perfil.username || 'usuario'}?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: bloqueouUsuario
                        ? 'Desbloquear usuário'
                        : 'Bloquear usuário',
                    style: 'destructive',
                    onPress: bloqueouUsuario
                        ? handleDesbloquear
                        : confirmarBloqueio
                },
                {
                    text: 'Denunciar perfil',
                    style: 'destructive',
                    onPress: () => setModalDenuncia(true)
                }
            ]
        );

    }


    // Confirmar bloqueio
    function confirmarBloqueio() {

        Alert.alert(
            'Bloquear usuário',
            'Este usuário não deverá mais interagir com você. Deseja continuar?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Bloquear',
                    style: 'destructive',
                    onPress: async () => {

                        try {

                            await bloquearUsuario(userId);

                            setBloqueouUsuario(true);

                            Alert.alert(
                                'Usuário bloqueado',
                                'O usuário foi adicionado à sua lista de bloqueados.'
                            );

                        } catch (error) {

                            console.log('Erro ao bloquear usuário:', error);

                            Alert.alert(
                                'Erro',
                                'Não foi possível bloquear este usuário.'
                            );

                        }

                    }
                }
            ]
        );

    }


    // Desbloquear usuário
    async function handleDesbloquear() {

        try {

            await desbloquearUsuario(userId);

            setBloqueouUsuario(false);

            Alert.alert(
                'Usuário desbloqueado',
                'O usuário foi removido da sua lista de bloqueados.'
            );

        } catch (error) {

            console.log('Erro ao desbloquear usuário:', error);

            Alert.alert(
                'Erro',
                'Não foi possível desbloquear este usuário.'
            );

        }

    }


    // Enviar denúncia
    async function handleEnviarDenuncia() {

        if (!motivoDenuncia) {

            Alert.alert(
                'Atenção',
                'Selecione um motivo para a denúncia.'
            );

            return;

        }

        try {

            setEnviandoDenuncia(true);

            await denunciarUsuario(
                userId,
                motivoDenuncia,
                detalhesDenuncia.trim() || null
            );

            setModalDenuncia(false);
            setMotivoDenuncia('');
            setDetalhesDenuncia('');

            Alert.alert(
                'Denúncia enviada',
                'Obrigado por ajudar a manter a comunidade segura.'
            );

        } catch (error) {

            console.log('Erro ao enviar denúncia:', error);

            Alert.alert(
                'Erro',
                'Não foi possível enviar sua denúncia.'
            );

        } finally {

            setEnviandoDenuncia(false);

        }

    }


    // Selecionar e enviar foto
    async function handleSelecionarFoto() {

        if (!meuPerfil || enviandoFoto) return;

        try {

            const permissao =
                await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissao.granted) {

                Alert.alert(
                    'Permissão necessária',
                    'Precisamos de acesso à galeria para escolher sua foto.'
                );

                return;

            }

            const resultado = await ImagePicker.launchImageLibraryAsync({

                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8

            });

            if (resultado.canceled || !resultado.assets?.length) {
                return;
            }

            const imagem = resultado.assets[0];

            setEnviandoFoto(true);

            const avatarUrl = await atualizarAvatar(
                userId,
                imagem,
                perfil?.avatar_url
            );

            setPerfil(perfilAtual => ({
                ...perfilAtual,
                avatar_url: avatarUrl
            }));

            Alert.alert(
                'Sucesso',
                'Sua foto de perfil foi atualizada!'
            );

        } catch (error) {

            console.log('Erro ao selecionar foto:', error);

            Alert.alert(
                'Erro',
                'Não foi possível atualizar sua foto de perfil.'
            );

        } finally {

            setEnviandoFoto(false);

        }

    }


    // Sair da conta
    function handleSair() {

        Alert.alert(
            'Sair da conta',
            'Tem certeza de que deseja sair da sua conta?',
            [
                {
                    text: 'Cancelar',
                    style: 'cancel'
                },
                {
                    text: 'Sair',
                    style: 'destructive',
                    onPress: async () => {

                        try {

                            await logoutUsuario();

                        } catch (error) {

                            console.log('Erro ao sair da conta:', error);

                            Alert.alert(
                                'Erro',
                                'Não foi possível sair da sua conta.'
                            );

                        }

                    }
                }
            ]
        );

    }


    // Carregamento
    if (loading) {

        return (

            <View style={styles.loading}>

                <ActivityIndicator
                    size="large"
                    color={CORES.destaque}
                />

                <Text style={styles.loadingTexto}>
                    Carregando perfil...
                </Text>

            </View>

        );

    }


    // Perfil bloqueado
    if (perfilBloqueado) {

        return (

            <View style={styles.loading}>

                <Text style={styles.erroTitulo}>
                    Perfil indisponível
                </Text>

                <Text
                    style={{
                        color: CORES.secundario,
                        fontSize: 13,
                        marginTop: 10,
                        textAlign: 'center'
                    }}
                >
                    Não é possível visualizar este perfil.
                </Text>

                <TouchableOpacity
                    style={styles.botaoVoltarErro}
                    onPress={() => onVoltar?.()}
                >

                    <Text style={styles.textoBotaoEditar}>
                        Voltar
                    </Text>

                </TouchableOpacity>

            </View>

        );

    }


    // Perfil não encontrado
    if (!perfil) {

        return (

            <View style={styles.loading}>

                <Text style={styles.erroTitulo}>
                    Perfil não encontrado.
                </Text>

                <TouchableOpacity
                    style={styles.botaoVoltarErro}
                    onPress={() => onVoltar?.()}
                >

                    <Text style={styles.textoBotaoEditar}>
                        Voltar
                    </Text>

                </TouchableOpacity>

            </View>

        );

    }


    const nome = perfil.full_name || 'Usuário';
    const username = perfil.username || 'usuario';


    return (

        <View style={styles.container}>

            {/* Cabeçalho */}

            <View style={styles.header}>

                <TouchableOpacity
                    style={styles.botaoVoltar}
                    onPress={() => onVoltar?.()}
                    activeOpacity={0.7}
                >

                    <Text style={styles.iconeVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>

                <Text style={styles.headerTitulo}>
                    Perfil
                </Text>

                <View style={styles.headerEspaco} />

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.conteudo}
            >

                {/* Cartão do perfil */}

                <View style={styles.cartaoPerfil}>

                    <View style={styles.topoPerfil}>

                        <View style={styles.avatarContainer}>

                            <TouchableOpacity
                                style={styles.avatar}
                                onPress={handleSelecionarFoto}
                                disabled={!meuPerfil || enviandoFoto}
                                activeOpacity={0.8}
                            >

                                {perfil.avatar_url ? (

                                    <Image
                                        source={{ uri: perfil.avatar_url }}
                                        style={styles.avatarImagem}
                                    />

                                ) : (

                                    <Text style={styles.avatarTexto}>
                                        {nome.charAt(0).toUpperCase()}
                                    </Text>

                                )}

                            </TouchableOpacity>


                            {meuPerfil && (

                                <TouchableOpacity
                                    style={styles.iconeCamera}
                                    onPress={handleSelecionarFoto}
                                    disabled={enviandoFoto}
                                >

                                    <Text style={styles.cameraTexto}>
                                        ✎
                                    </Text>

                                </TouchableOpacity>

                            )}

                        </View>


                        <View style={styles.informacoesPrincipais}>

                            <Text style={styles.nome}>
                                {nome}
                            </Text>

                            <Text style={styles.username}>
                                @{username}
                            </Text>

                            {enviandoFoto && (

                                <View style={styles.enviando}>

                                    <ActivityIndicator
                                        size="small"
                                        color={CORES.destaque}
                                    />

                                    <Text style={styles.enviandoTexto}>
                                        Enviando foto...
                                    </Text>

                                </View>

                            )}

                        </View>


                        {!meuPerfil && (

                            <TouchableOpacity
                                style={styles.botaoOpcoes}
                                onPress={handleOpcoesSeguranca}
                                activeOpacity={0.7}
                            >

                                <Text style={styles.iconeOpcoes}>
                                    ⋮
                                </Text>

                            </TouchableOpacity>

                        )}

                    </View>


                    {/* Biografia */}

                    <View style={styles.bioContainer}>

                        <Text style={styles.bioTitulo}>
                            Sobre
                        </Text>

                        <Text style={styles.bio}>
                            {perfil.bio?.trim()
                                || 'Este usuário ainda não adicionou uma biografia.'}
                        </Text>

                    </View>


                    {/* Estatísticas */}

                    <View style={styles.estatisticas}>

                        <View style={styles.estatistica}>

                            <Text style={styles.numero}>
                                {publicacoes.length}
                            </Text>

                            <Text style={styles.label}>
                                Publicações
                            </Text>

                        </View>


                        <View style={styles.estatistica}>

                            <Text style={styles.numero}>
                                {estatisticasSeguidores.seguidores}
                            </Text>

                            <Text style={styles.label}>
                                Seguidores
                            </Text>

                        </View>


                        <View style={styles.estatistica}>

                            <Text style={styles.numero}>
                                {estatisticasSeguidores.seguindo}
                            </Text>

                            <Text style={styles.label}>
                                Seguindo
                            </Text>

                        </View>

                    </View>


                    {/* Ações */}

                    {meuPerfil ? (

                        <>

                            <TouchableOpacity
                                style={styles.botaoEditar}
                                onPress={() => onEditar?.(perfil)}
                                activeOpacity={0.8}
                            >

                                <Text style={styles.textoBotaoEditar}>
                                    Editar perfil
                                </Text>

                                <Text style={styles.iconeBotao}>
                                    →
                                </Text>

                            </TouchableOpacity>


                            {/* Publicações salvas */}

                            <TouchableOpacity
                                style={styles.botaoSalvos}
                                onPress={() => onAbrirSalvos?.()}
                                activeOpacity={0.8}
                            >

                                <View style={styles.iconeSalvosContainer}>

                                    <Text style={styles.iconeSalvos}>
                                        ▰
                                    </Text>

                                </View>

                                <View style={styles.informacoesSalvos}>

                                    <Text style={styles.tituloSalvos}>
                                        Publicações salvas
                                    </Text>

                                    <Text style={styles.subtituloSalvos}>
                                        Veja tudo o que você guardou
                                    </Text>

                                </View>

                                <Text style={styles.setaSalvos}>
                                    →
                                </Text>

                            </TouchableOpacity>

                        </>

                    ) : (

                        <View style={styles.areaBotoesPerfil}>

                            <TouchableOpacity
                                style={[
                                    styles.botaoSeguir,
                                    segueUsuario && styles.botaoSeguindo
                                ]}
                                onPress={handleAlternarSeguidor}
                                disabled={alterandoSeguidor}
                                activeOpacity={0.8}
                            >

                                <Text style={styles.textoBotaoSeguir}>
                                    {alterandoSeguidor
                                        ? 'Aguarde...'
                                        : segueUsuario
                                            ? '✓ Seguindo'
                                            : '+ Seguir'}
                                </Text>

                            </TouchableOpacity>


                            <TouchableOpacity
                                style={[
                                    styles.botaoMensagem,
                                    styles.botaoMensagemPerfil
                                ]}
                                onPress={() => onMensagem?.()}
                                activeOpacity={0.8}
                            >

                                <Text style={styles.textoBotaoMensagem}>
                                    ✉  Mensagem
                                </Text>

                            </TouchableOpacity>

                        </View>

                    )}

                </View>


                {/* Cabeçalho das publicações */}

                <View style={styles.publicacoesHeader}>

                    <View>

                        <Text style={styles.publicacoesTitulo}>
                            Publicações
                        </Text>

                        <Text style={styles.publicacoesSubtitulo}>
                            Compartilhamentos de {nome.split(' ')[0]}
                        </Text>

                    </View>

                    <View style={styles.contadorPublicacoes}>

                        <Text style={styles.contadorTexto}>
                            {publicacoes.length}
                        </Text>

                    </View>

                </View>


                {/* Lista de publicações */}

                {publicacoes.length === 0 ? (

                    <View style={styles.vazioContainer}>

                        <View style={styles.vazioIconeContainer}>

                            <Text style={styles.vazioIcone}>
                                ✎
                            </Text>

                        </View>

                        <Text style={styles.vazioTitulo}>
                            Nenhuma publicação ainda
                        </Text>

                        <Text style={styles.vazioTexto}>
                            Quando este usuário compartilhar algo, as publicações aparecerão aqui.
                        </Text>

                    </View>

                ) : (

                    publicacoes.map(item => (

                        <View
                            key={item.id}
                            style={styles.publicacao}
                        >

                            <View style={styles.publicacaoTopo}>

                                <View style={styles.publicacaoAvatar}>

                                    {perfil.avatar_url ? (

                                        <Image
                                            source={{
                                                uri: perfil.avatar_url
                                            }}
                                            style={styles.publicacaoAvatarImagem}
                                        />

                                    ) : (

                                        <Text style={styles.publicacaoAvatarTexto}>
                                            {nome.charAt(0).toUpperCase()}
                                        </Text>

                                    )}

                                </View>


                                <View style={styles.publicacaoAutor}>

                                    <Text style={styles.publicacaoNome}>
                                        {nome}
                                    </Text>

                                    <Text style={styles.publicacaoUsername}>
                                        @{username}
                                    </Text>

                                </View>

                            </View>


                            {!!item.content?.trim() && (

                                <Text style={styles.publicacaoTexto}>
                                    {item.content}
                                </Text>

                            )}


                            {/* Imagem da publicação */}

                            {!!item.image_url && (

                                <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.imagemPublicacao}
                                    resizeMode="cover"
                                />

                            )}


                            <View style={styles.publicacaoAcoes}>

                                <View style={styles.acao}>

                                    <Text style={styles.acaoIcone}>
                                        ♥
                                    </Text>

                                    <Text style={styles.acaoTexto}>
                                        {item.likes?.length || 0}
                                    </Text>

                                </View>


                                <View style={styles.acao}>

                                    <Text style={styles.acaoIcone}>
                                        ○
                                    </Text>

                                    <Text style={styles.acaoTexto}>
                                        {item.comments?.length || 0}
                                    </Text>

                                </View>

                            </View>

                        </View>

                    ))

                )}


                {/* Sair da conta */}

                {meuPerfil && (

                    <TouchableOpacity
                        style={styles.botaoSair}
                        onPress={handleSair}
                        activeOpacity={0.8}
                    >

                        <Text style={styles.iconeSair}>
                            ↪
                        </Text>

                        <Text style={styles.textoBotaoSair}>
                            Sair da conta
                        </Text>

                    </TouchableOpacity>

                )}

            </ScrollView>


            {/* Modal de denúncia */}

            <Modal
                visible={modalDenuncia}
                transparent
                animationType="fade"
                onRequestClose={() => setModalDenuncia(false)}
            >

                <View style={styles.modalFundo}>

                    <View style={styles.modalContainer}>

                        <Text style={styles.modalTitulo}>
                            Denunciar perfil
                        </Text>

                        <Text style={styles.modalSubtitulo}>
                            Por que deseja denunciar este usuário?
                        </Text>


                        {[
                            'Spam',
                            'Assédio ou bullying',
                            'Discurso de ódio',
                            'Conteúdo impróprio',
                            'Perfil falso',
                            'Outro motivo'
                        ].map(motivo => (

                            <TouchableOpacity
                                key={motivo}
                                style={[
                                    styles.opcaoDenuncia,
                                    motivoDenuncia === motivo && styles.opcaoDenunciaAtiva
                                ]}
                                onPress={() => setMotivoDenuncia(motivo)}
                            >

                                <Text style={styles.textoOpcaoDenuncia}>
                                    {motivo}
                                </Text>

                                <Text style={styles.marcadorDenuncia}>
                                    {motivoDenuncia === motivo ? '●' : '○'}
                                </Text>

                            </TouchableOpacity>

                        ))}


                        <TextInput
                            style={styles.inputDenuncia}
                            placeholder="Detalhes adicionais (opcional)"
                            placeholderTextColor={CORES.secundario}
                            value={detalhesDenuncia}
                            onChangeText={setDetalhesDenuncia}
                            multiline
                            maxLength={500}
                            textAlignVertical="top"
                        />


                        <TouchableOpacity
                            style={styles.botaoEnviarDenuncia}
                            onPress={handleEnviarDenuncia}
                            disabled={enviandoDenuncia}
                        >

                            {enviandoDenuncia ? (

                                <ActivityIndicator color="#FFFFFF" />

                            ) : (

                                <Text style={styles.textoBotaoEnviar}>
                                    Enviar denúncia
                                </Text>

                            )}

                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.botaoCancelarDenuncia}
                            onPress={() => setModalDenuncia(false)}
                            disabled={enviandoDenuncia}
                        >

                            <Text style={styles.textoCancelarDenuncia}>
                                Cancelar
                            </Text>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

        </View>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: CORES.fundo
    },

    loadingTexto: {
        fontSize: 13,
        color: CORES.secundario,
        marginTop: 12
    },

    erroTitulo: {
        fontSize: 16,
        fontWeight: '600',
        color: CORES.texto
    },

    botaoVoltarErro: {
        marginTop: 15,
        paddingHorizontal: 22,
        paddingVertical: 12,
        backgroundColor: CORES.destaque,
        borderRadius: 12
    },

    textoBotaoEditar: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },

    textoBotaoPrincipal: {
        color: '#FFFFFF',
        fontWeight: '700'
    },


    // Cabeçalho

    header: {
        height: 62,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: CORES.fundo,
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    botaoVoltar: {
        width: 40,
        height: 40,
        borderRadius: 13,
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeVoltar: {
        fontSize: 32,
        color: CORES.texto,
        lineHeight: 35
    },

    headerTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: CORES.texto
    },

    headerEspaco: {
        width: 40
    },


    conteudo: {
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 120
    },


    // Cartão do perfil

    cartaoPerfil: {
        backgroundColor: CORES.card,
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    topoPerfil: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    avatarContainer: {
        position: 'relative'
    },

    avatar: {
        width: 83,
        height: 83,
        borderRadius: 42,
        backgroundColor: CORES.cardSecundario,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: CORES.destaque
    },

    avatarImagem: {
        width: '100%',
        height: '100%',
        borderRadius: 42
    },

    avatarTexto: {
        color: CORES.destaque,
        fontSize: 31,
        fontWeight: '700'
    },

    iconeCamera: {
        position: 'absolute',
        bottom: -2,
        right: -3,
        width: 29,
        height: 29,
        borderRadius: 15,
        backgroundColor: CORES.destaque,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: CORES.card
    },

    cameraTexto: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },

    informacoesPrincipais: {
        flex: 1,
        marginLeft: 16
    },

    nome: {
        fontSize: 19,
        fontWeight: '700',
        color: CORES.texto
    },

    username: {
        fontSize: 13,
        color: CORES.secundario,
        marginTop: 5
    },

    enviando: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginTop: 8
    },

    enviandoTexto: {
        fontSize: 11,
        color: CORES.secundario
    },


    // Biografia

    bioContainer: {
        marginTop: 24,
        paddingTop: 18,
        borderTopWidth: 1,
        borderTopColor: CORES.borda
    },

    bioTitulo: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto,
        marginBottom: 7
    },

    bio: {
        fontSize: 13,
        lineHeight: 21,
        color: CORES.secundario
    },


    // Estatísticas

    estatisticas: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingVertical: 15,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: CORES.borda
    },

    estatistica: {
        alignItems: 'center',
        minWidth: 80
    },

    numero: {
        fontSize: 21,
        fontWeight: '700',
        color: CORES.texto
    },

    label: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 4
    },


    // Botões

    botaoEditar: {
        height: 48,
        backgroundColor: CORES.destaque,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginTop: 18
    },

    iconeBotao: {
        color: '#FFFFFF',
        fontSize: 18,
        marginLeft: 9
    },

    botaoSalvos: {
        minHeight: 68,
        backgroundColor: CORES.cardSecundario,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CORES.borda,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 13,
        marginTop: 11
    },

    iconeSalvosContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#30213D',
        alignItems: 'center',
        justifyContent: 'center'
    },

    iconeSalvos: {
        fontSize: 20,
        color: CORES.destaque
    },

    informacoesSalvos: {
        flex: 1,
        marginLeft: 12
    },

    tituloSalvos: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto
    },

    subtituloSalvos: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 4
    },

    setaSalvos: {
        fontSize: 20,
        color: CORES.secundario,
        marginLeft: 8
    },

    areaBotoesPerfil: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 18
    },

    botaoSeguir: {
        flex: 1,
        height: 48,
        backgroundColor: CORES.destaque,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center'
    },

    botaoSeguindo: {
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: CORES.destaque
    },

    textoBotaoSeguir: {
        color: CORES.texto,
        fontSize: 13,
        fontWeight: '700'
    },

    botaoMensagem: {
        height: 48,
        backgroundColor: CORES.destaque,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18
    },

    botaoMensagemPerfil: {
        flex: 1,
        marginTop: 0
    },

    textoBotaoMensagem: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },


    // Opções de segurança

    botaoOpcoes: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8
    },

    iconeOpcoes: {
        color: CORES.texto,
        fontSize: 25,
        fontWeight: '700',
        lineHeight: 28
    },


    // Sair da conta

    botaoSair: {
        height: 52,
        backgroundColor: '#24151D',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#482735',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        marginBottom: 20
    },

    iconeSair: {
        fontSize: 20,
        color: CORES.vermelho,
        marginRight: 10
    },

    textoBotaoSair: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.vermelho
    },


    // Publicações

    publicacoesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 29,
        marginBottom: 15,
        paddingHorizontal: 3
    },

    publicacoesTitulo: {
        fontSize: 19,
        fontWeight: '700',
        color: CORES.texto
    },

    publicacoesSubtitulo: {
        fontSize: 11,
        color: CORES.secundario,
        marginTop: 4
    },

    contadorPublicacoes: {
        minWidth: 31,
        height: 31,
        borderRadius: 10,
        backgroundColor: CORES.cardSecundario,
        borderWidth: 1,
        borderColor: CORES.borda,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8
    },

    contadorTexto: {
        fontSize: 12,
        fontWeight: '700',
        color: CORES.destaque
    },


    // Estado vazio

    vazioContainer: {
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 20,
        paddingHorizontal: 25,
        paddingVertical: 35,
        alignItems: 'center'
    },

    vazioIconeContainer: {
        width: 55,
        height: 55,
        borderRadius: 17,
        backgroundColor: CORES.cardSecundario,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15
    },

    vazioIcone: {
        fontSize: 25,
        color: CORES.destaque
    },

    vazioTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: CORES.texto,
        textAlign: 'center'
    },

    vazioTexto: {
        fontSize: 12,
        lineHeight: 19,
        color: CORES.secundario,
        textAlign: 'center',
        marginTop: 8
    },


    // Cartões de publicação

    publicacao: {
        backgroundColor: CORES.card,
        borderRadius: 18,
        padding: 16,
        marginBottom: 13,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    publicacaoTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 13
    },

    publicacaoAvatar: {
        width: 38,
        height: 38,
        borderRadius: 20,
        backgroundColor: CORES.cardSecundario,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
    },

    publicacaoAvatarImagem: {
        width: '100%',
        height: '100%'
    },

    publicacaoAvatarTexto: {
        color: CORES.destaque,
        fontSize: 15,
        fontWeight: '700'
    },

    publicacaoAutor: {
        marginLeft: 10
    },

    publicacaoNome: {
        fontSize: 13,
        fontWeight: '700',
        color: CORES.texto
    },

    publicacaoUsername: {
        fontSize: 10,
        color: CORES.secundario,
        marginTop: 3
    },

    publicacaoTexto: {
        fontSize: 14,
        lineHeight: 22,
        color: CORES.texto
    },

    imagemPublicacao: {
        width: '100%',
        height: 230,
        borderRadius: 13,
        marginTop: 12,
        backgroundColor: CORES.cardSecundario
    },

    publicacaoAcoes: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: CORES.borda
    },

    acao: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    acaoIcone: {
        fontSize: 17,
        color: CORES.destaque
    },

    acaoTexto: {
        fontSize: 12,
        color: CORES.secundario
    },


    // Modal de denúncia

    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },

    modalContainer: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: CORES.card,
        borderRadius: 22,
        padding: 20,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    modalTitulo: {
        color: CORES.texto,
        fontSize: 19,
        fontWeight: '700'
    },

    modalSubtitulo: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 7,
        marginBottom: 17
    },

    opcaoDenuncia: {
        minHeight: 43,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 13,
        marginBottom: 7,
        backgroundColor: CORES.cardSecundario,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    opcaoDenunciaAtiva: {
        borderColor: CORES.destaque,
        backgroundColor: '#30213D'
    },

    textoOpcaoDenuncia: {
        color: CORES.texto,
        fontSize: 12
    },

    marcadorDenuncia: {
        color: CORES.destaque,
        fontSize: 17
    },

    inputDenuncia: {
        minHeight: 90,
        backgroundColor: CORES.cardSecundario,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: CORES.borda,
        padding: 12,
        color: CORES.texto,
        fontSize: 12,
        marginTop: 8,
        marginBottom: 15
    },

    botaoEnviarDenuncia: {
        height: 46,
        backgroundColor: CORES.destaque,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center'
    },

    textoBotaoEnviar: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },

    botaoCancelarDenuncia: {
        alignItems: 'center',
        paddingVertical: 13
    },

    textoCancelarDenuncia: {
        color: CORES.secundario,
        fontSize: 13,
        fontWeight: '600'
    }

});