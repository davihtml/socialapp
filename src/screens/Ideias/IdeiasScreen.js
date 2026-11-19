import React, { useCallback, useEffect, useState } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Modal,
    ActivityIndicator,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';

import DetalheIdeiaScreen from './DetalheIdeiaScreen';

import {
    buscarIdeias,
    buscarMinhasIdeias,
    buscarMinhasContribuicoes,
    criarIdeia
} from '../../services/ideas';

const CORES = {
    fundo: '#0B0910',
    card: '#191521',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#30283B',
    campo: '#100E16'
};

const ABAS = [
    { id: 'explorar', titulo: 'Explorar' },
    { id: 'minhas', titulo: 'Minhas ideias' },
    { id: 'contribuicoes', titulo: 'Contribuições' }
];

export default function IdeiasScreen() {

    const [ideiaSelecionada, setIdeiaSelecionada] = useState(null);

    const [aba, setAba] = useState('explorar');

    const [ideias, setIdeias] = useState([]);

    const [carregando, setCarregando] = useState(true);

    const [atualizando, setAtualizando] = useState(false);

    const [modalCriar, setModalCriar] = useState(false);

    const [titulo, setTitulo] = useState('');

    const [descricao, setDescricao] = useState('');

    const [salvando, setSalvando] = useState(false);


    // Buscar ideias conforme a aba selecionada
    const carregarIdeias = useCallback(async (atualizacao = false) => {

        try {

            if (atualizacao) {
                setAtualizando(true);
            } else {
                setCarregando(true);
            }

            let resultado = [];

            if (aba === 'explorar') {

                resultado = await buscarIdeias(20, 0);

            } else if (aba === 'minhas') {

                resultado = await buscarMinhasIdeias();

            } else if (aba === 'contribuicoes') {

                resultado = await buscarMinhasContribuicoes();

            }

            setIdeias(resultado || []);

        } catch (error) {

            console.log('[ORBIT] ERRO AO BUSCAR IDEIAS:', error);

            Alert.alert(
                'Erro',
                'Não foi possível carregar as ideias.'
            );

        } finally {

            setCarregando(false);

            setAtualizando(false);

        }

    }, [aba]);


    useEffect(() => {

        carregarIdeias();

    }, [carregarIdeias]);


    // Criar uma ideia
    async function handleCriarIdeia() {

        if (!titulo.trim() || !descricao.trim()) {

            Alert.alert(
                'Campos obrigatórios',
                'Preencha o título e a descrição da ideia.'
            );

            return;

        }

        try {

            setSalvando(true);

            await criarIdeia(
                titulo.trim(),
                descricao.trim()
            );

            setTitulo('');

            setDescricao('');

            setModalCriar(false);

            setAba('minhas');

            Alert.alert(
                'Ideia criada',
                'Sua ideia foi publicada com sucesso.'
            );

        } catch (error) {

            console.log('[ORBIT] ERRO AO CRIAR IDEIA:', error);

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível criar sua ideia.'
            );

        } finally {

            setSalvando(false);

        }

    }


    // Informações de cada cartão
    function obterDadosCartao(item) {

        if (aba === 'contribuicoes') {

            return {
                titulo: item.ideas?.title || 'Ideia indisponível',
                descricao: item.content,
                autor: 'Sua contribuição',
                status: null
            };

        }

        return {
            titulo: item.title,
            descricao: item.description,
            autor: aba === 'minhas'
                ? 'Sua ideia'
                : item.profiles?.full_name ||
                item.profiles?.username ||
                'Usuário',
            status: item.status
        };

    }


    // Texto do status
    function obterStatus(status) {

        const statusMap = {
            developing: 'Em desenvolvimento',
            paused: 'Pausada',
            completed: 'Concluída',
            archived: 'Arquivada'
        };

        return statusMap[status] || 'Em desenvolvimento';

    }

    // Abrir detalhes da ideia
    if (ideiaSelecionada) {

        return (
            <DetalheIdeiaScreen
                ideiaId={ideiaSelecionada}
                onVoltar={() => setIdeiaSelecionada(null)}
            />
        );

    }


    // Cartão de ideia
    function renderizarCartao(item, index) {

        const dados = obterDadosCartao(item);

        return (

            <TouchableOpacity
                key={item.id || index}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => {

                    const id = aba === 'contribuicoes'
                        ? item.idea_id
                        : item.id;

                    setIdeiaSelecionada(id);

                }}
            >

                <View style={styles.cardTopo}>

                    <View style={styles.cardIndicador} />

                    {dados.status && (

                        <Text style={styles.status}>
                            {obterStatus(dados.status)}
                        </Text>

                    )}

                </View>


                <Text style={styles.cardTitulo}>
                    {dados.titulo}
                </Text>


                <Text
                    style={styles.cardDescricao}
                    numberOfLines={3}
                >
                    {dados.descricao}
                </Text>


                <View style={styles.cardRodape}>

                    <Text style={styles.cardAutor}>
                        {dados.autor}
                    </Text>

                    <Text style={styles.cardSeta}>
                        ›
                    </Text>

                </View>

            </TouchableOpacity>

        );

    }


    return (

        <View style={styles.container}>

            {/* CABEÇALHO */}

            <View style={styles.header}>

                <View>

                    <Text style={styles.tituloPagina}>
                        Ideias
                    </Text>

                    <Text style={styles.subtitulo}>
                        Ideias crescem quando são compartilhadas.
                    </Text>

                </View>


                <TouchableOpacity
                    style={styles.botaoCriar}
                    onPress={() => setModalCriar(true)}
                >

                    <Text style={styles.botaoCriarTexto}>
                        ＋
                    </Text>

                </TouchableOpacity>

            </View>


            {/* ABAS */}

            <View style={styles.abas}>

                {ABAS.map(item => (

                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.aba,
                            aba === item.id && styles.abaAtiva
                        ]}
                        onPress={() => setAba(item.id)}
                    >

                        <Text
                            style={[
                                styles.abaTexto,
                                aba === item.id && styles.abaTextoAtivo
                            ]}
                        >
                            {item.titulo}
                        </Text>

                    </TouchableOpacity>

                ))}

            </View>


            {/* LISTA */}

            <ScrollView
                style={styles.lista}
                contentContainerStyle={styles.listaConteudo}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={atualizando}
                        onRefresh={() => carregarIdeias(true)}
                        tintColor={CORES.destaque}
                        colors={[CORES.destaque]}
                    />
                }
            >

                {carregando ? (

                    <ActivityIndicator
                        size="large"
                        color={CORES.destaque}
                        style={styles.carregando}
                    />

                ) : ideias.length > 0 ? (

                    ideias.map(renderizarCartao)

                ) : (

                    <View style={styles.vazio}>

                        <Text style={styles.vazioIcone}>
                            ◇
                        </Text>

                        <Text style={styles.vazioTitulo}>
                            {aba === 'explorar'
                                ? 'Nenhuma ideia encontrada'
                                : aba === 'minhas'
                                    ? 'Você ainda não criou ideias'
                                    : 'Nenhuma contribuição ainda'}
                        </Text>

                        <Text style={styles.vazioDescricao}>
                            {aba === 'explorar'
                                ? 'Novas ideias aparecerão aqui.'
                                : aba === 'minhas'
                                    ? 'Compartilhe sua primeira ideia com a comunidade.'
                                    : 'Quando você contribuir com uma ideia, ela aparecerá aqui.'}
                        </Text>

                        {aba === 'minhas' && (

                            <TouchableOpacity
                                style={styles.botaoVazio}
                                onPress={() => setModalCriar(true)}
                            >

                                <Text style={styles.botaoVazioTexto}>
                                    Criar primeira ideia
                                </Text>

                            </TouchableOpacity>

                        )}

                    </View>

                )}

                <View style={{ height: 110 }} />

            </ScrollView>


            {/* MODAL DE CRIAÇÃO */}

            <Modal
                visible={modalCriar}
                transparent
                animationType="slide"
                onRequestClose={() => setModalCriar(false)}
            >

                <KeyboardAvoidingView
                    style={styles.modalFundo}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >

                    <View style={styles.modalContainer}>

                        <View style={styles.modalTopo}>



                            <TouchableOpacity
                                onPress={() => setModalCriar(false)}
                            >

                            </TouchableOpacity>

                        </View>

                        <View style={styles.modalTopo}>
    <Text style={styles.modalTitulo}>
        Nova ideia
    </Text>

    <TouchableOpacity
        onPress={() => setModalCriar(false)}
    >
        <Text style={styles.modalFechar}>
            ✕
        </Text>
    </TouchableOpacity>
</View>

<Text style={styles.modalDescricao}>
    Compartilhe sua ideia com a comunidade e permita que outras pessoas ajudem a desenvolvê-la.
</Text>


                        <Text style={styles.label}>
                            Título
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Dê um nome à sua ideia"
                            placeholderTextColor={CORES.secundario}
                            value={titulo}
                            onChangeText={setTitulo}
                            maxLength={120}
                        />


                        <Text style={styles.label}>
                            Descrição
                        </Text>

                        <TextInput
                            style={[
                                styles.input,
                                styles.inputDescricao,
                            ]}
                            placeholder="Explique sua ideia e o que você pretende desenvolver..."
                            placeholderTextColor={CORES.secundario}
                            value={descricao}
                            onChangeText={setDescricao}
                            multiline
                            textAlignVertical="top"
                            maxLength={3000}
                        />

                        <Text style={styles.contadorCaracteres}>
                            {descricao.length}/3000 caracteres
                        </Text>


                        <Text style={styles.contadorCaracteres}>
                            {titulo.length}/120 caracteres
                        </Text>


                        <TouchableOpacity
                            style={[
                                styles.botaoPublicar,
                                (salvando || !titulo.trim() || !descricao.trim()) &&
                                styles.botaoDesativado
                            ]}
                            onPress={handleCriarIdeia}
                            disabled={salvando || !titulo.trim() || !descricao.trim()}
                        >

                            {salvando ? (

                                <ActivityIndicator color="#0B0910" />

                            ) : (

                                <Text style={styles.botaoPublicarTexto}>
                                    Publicar ideia
                                </Text>

                            )}

                        </TouchableOpacity>

                    </View>

                </KeyboardAvoidingView>

            </Modal>

        </View>

    );

}


// ESTILOS

const styles = StyleSheet.create({

    modalDescricao: {
        color: CORES.secundario,
        fontSize: 12,
        lineHeight: 19,
        marginTop: -13,
        marginBottom: 15
    },


    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    header: {
        paddingHorizontal: 22,
        paddingTop: 55,
        paddingBottom: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    tituloPagina: {
        color: CORES.texto,
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8
    },

    subtitulo: {
        color: CORES.secundario,
        fontSize: 12,
        marginTop: 6,
        letterSpacing: 0.1
    },

    botaoCriar: {
        width: 48,
        height: 48,
        borderRadius: 16,
        backgroundColor: CORES.destaque,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5,
        shadowColor: CORES.destaque,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 3
        }
    },

    botaoCriarTexto: {
        color: CORES.fundo,
        fontSize: 30,
        lineHeight: 35,
        fontWeight: '400'
    },

    abas: {
        flexDirection: 'row',
        marginHorizontal: 18,
        padding: 5,
        backgroundColor: CORES.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: CORES.borda,
        marginBottom: 8
    },

    aba: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10
    },

    abaAtiva: {
        backgroundColor: '#30223D'
    },

    abaTexto: {
        color: CORES.secundario,
        fontSize: 11,
        fontWeight: '600'
    },

    abaTextoAtivo: {
        color: CORES.destaque,
        fontWeight: '800'
    },

    lista: {
        flex: 1
    },

    listaConteudo: {
        paddingHorizontal: 18,
        paddingTop: 17,
        paddingBottom: 20
    },

    card: {
        backgroundColor: CORES.card,
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: CORES.borda,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 3
        }
    },

    cardTopo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },

    cardIndicador: {
        width: 30,
        height: 4,
        borderRadius: 5,
        backgroundColor: CORES.destaque
    },

    status: {
        color: CORES.destaque,
        fontSize: 10,
        fontWeight: '700',
        backgroundColor: '#30223D',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        overflow: 'hidden'
    },

    cardTitulo: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '800',
        marginBottom: 9,
        letterSpacing: -0.3
    },

    cardDescricao: {
        color: '#AAA2B5',
        fontSize: 12,
        lineHeight: 20
    },

    cardRodape: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: CORES.borda
    },

    cardAutor: {
        color: CORES.destaque,
        fontSize: 11,
        fontWeight: '700'
    },

    cardSeta: {
        color: CORES.destaque,
        fontSize: 23,
        fontWeight: '300'
    },

    carregando: {
        marginTop: 75
    },

    vazio: {
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 90
    },

    vazioIcone: {
        color: CORES.destaque,
        fontSize: 48,
        marginBottom: 18
    },

    vazioTitulo: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center'
    },

vazioDescricao: {
    color: CORES.secundario,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 10
},

    botaoVazio: {
        backgroundColor: CORES.destaque,
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 13,
        marginTop: 24
    },

    botaoVazioTexto: {
        color: CORES.fundo,
        fontWeight: '800',
        fontSize: 12
    },

    modalFundo: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.78)',
        justifyContent: 'flex-end'
    },

    modalContainer: {
        backgroundColor: '#191521',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 23,
        paddingTop: 25,
        paddingBottom: 35,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    modalTopo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 23
    },

    modalTitulo: {
        color: CORES.texto,
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5
    },

    modalFechar: {
        color: CORES.secundario,
        fontSize: 19,
        padding: 8
    },

    label: {
        color: CORES.texto,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 9,
        marginTop: 13
    },

    input: {
        backgroundColor: CORES.campo,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 14,
        padding: 15,
        color: CORES.texto,
        fontSize: 13
    },

    inputDescricao: {
        height: 135,
        lineHeight: 20
    },

    contadorCaracteres: {
        color: CORES.secundario,
        fontSize: 10,
        textAlign: 'right',
        marginTop: 9
    },

    botaoPublicar: {
        backgroundColor: CORES.destaque,
        borderRadius: 14,
        padding: 17,
        alignItems: 'center',
        marginTop: 24
    },

    botaoPublicarTexto: {
        color: CORES.fundo,
        fontWeight: '800',
        fontSize: 13
    },

    botaoDesativado: {
        opacity: 0.6
    }

});