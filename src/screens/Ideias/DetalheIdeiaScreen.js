import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TextInput
} from 'react-native';

import {
    buscarIdeiaPorId,
    buscarContribuicoes,
    buscarRamificacoes,
    buscarColaboradores,
    buscarVersoes,
    criarContribuicao,
    criarRamificacao
} from '../../services/ideas';


const CORES = {
    fundo: '#0B0910',
    card: '#191521',
    destaque: '#B66AE8',
    texto: '#F2EFF7',
    secundario: '#91899D',
    borda: '#30283B'
};


const ABAS = [
    { id: 'visao', titulo: 'Visão geral' },
    { id: 'evolucao', titulo: 'Evolução' },
    { id: 'versoes', titulo: 'Versões' }
];


export default function DetalheIdeiaScreen({
    ideiaId,
    onVoltar
}) {

    const [aba, setAba] = useState('visao');

    const [contribuicaoRamificacao, setContribuicaoRamificacao] = useState(null);

const [tituloRamificacao, setTituloRamificacao] = useState('');

const [descricaoRamificacao, setDescricaoRamificacao] = useState('');

const [criandoRamificacao, setCriandoRamificacao] = useState(false);

    const [ideia, setIdeia] = useState(null);

    const [contribuicoes, setContribuicoes] = useState([]);

    const [ramificacoes, setRamificacoes] = useState([]);

    const [colaboradores, setColaboradores] = useState([]);

    const [versoes, setVersoes] = useState([]);

    const [carregando, setCarregando] = useState(true);

    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [textoContribuicao, setTextoContribuicao] = useState('');

    const [enviando, setEnviando] = useState(false);


    // Carregar informações da ideia
    async function carregarDetalhes() {

        try {

            setCarregando(true);

            const [
                dadosIdeia,
                dadosContribuicoes,
                dadosRamificacoes,
                dadosColaboradores,
                dadosVersoes
            ] = await Promise.all([

                buscarIdeiaPorId(ideiaId),

                buscarContribuicoes(ideiaId),

                buscarRamificacoes(ideiaId),

                buscarColaboradores(ideiaId),

                buscarVersoes(ideiaId)

            ]);


            if (!dadosIdeia) {

                Alert.alert(
                    'Ideia indisponível',
                    'Não foi possível encontrar esta ideia.'
                );

                onVoltar();

                return;

            }


            setIdeia(dadosIdeia);

            setContribuicoes(dadosContribuicoes || []);

            setRamificacoes(dadosRamificacoes || []);

            setColaboradores(dadosColaboradores || []);

            setVersoes(dadosVersoes || []);

        } catch (error) {

            console.log(
                '[ORBIT] ERRO AO CARREGAR DETALHES:',
                error
            );

            Alert.alert(
                'Erro',
                'Não foi possível carregar os detalhes da ideia.'
            );

        } finally {

            setCarregando(false);

        }

    }


    useEffect(() => {

        carregarDetalhes();

    }, [ideiaId]);


    // Enviar contribuição
    async function enviarContribuicao() {

        const texto = textoContribuicao.trim();

        if (!texto) {

            Alert.alert(
                'Contribuição vazia',
                'Escreva sua contribuição antes de enviar.'
            );

            return;

        }


        try {

            setEnviando(true);

            await criarContribuicao(
                ideiaId,
                texto
            );


            const dadosAtualizados = await buscarContribuicoes(ideiaId);

            setContribuicoes(dadosAtualizados || []);

            setTextoContribuicao('');

            setMostrarFormulario(false);

            Alert.alert(
                'Contribuição enviada',
                'Sua contribuição foi adicionada à ideia.'
            );

        } catch (error) {

            console.log(
                '[ORBIT] ERRO AO ENVIAR CONTRIBUIÇÃO:',
                error
            );

            Alert.alert(
                'Erro',
                error.message || 'Não foi possível enviar sua contribuição.'
            );

        } finally {

            setEnviando(false);

        }

    }


    async function enviarRamificacao() {

    if (!tituloRamificacao.trim() || !descricaoRamificacao.trim()) {

        Alert.alert(
            'Campos obrigatórios',
            'Informe o título e a descrição da ramificação.'
        );

        return;

    }

    try {

        setCriandoRamificacao(true);

        await criarRamificacao(
            contribuicaoRamificacao,
            tituloRamificacao,
            descricaoRamificacao
        );

        const dadosAtualizados = await buscarRamificacoes(ideiaId);

        setRamificacoes(dadosAtualizados || []);

        setTituloRamificacao('');
        setDescricaoRamificacao('');
        setContribuicaoRamificacao(null);

        Alert.alert(
            'Ramificação criada',
            'Seu novo caminho foi criado e vinculado à contribuição original.'
        );

    } catch (error) {

        console.log(
            '[ORBIT] ERRO AO CRIAR RAMIFICAÇÃO:',
            error
        );

        Alert.alert(
            'Erro',
            error.message || 'Não foi possível criar a ramificação.'
        );

    } finally {

        setCriandoRamificacao(false);

    }

}

    // Nome do usuário
    function nomeUsuario(perfil) {

        return (
            perfil?.full_name ||
            perfil?.username ||
            'Usuário'
        );

    }


    // Status da ideia
    function obterStatus(status) {

        const statusMap = {
            developing: 'Em desenvolvimento',
            paused: 'Pausada',
            completed: 'Concluída',
            archived: 'Arquivada'
        };

        return statusMap[status] || 'Em desenvolvimento';

    }


    // Data formatada
    function formatarData(data) {

        if (!data) return '';

        return new Date(data).toLocaleDateString('pt-BR');

    }


    if (carregando) {

        return (

            <View style={styles.carregando}>

                <ActivityIndicator
                    size="large"
                    color={CORES.destaque}
                />

                <Text style={styles.textoCarregando}>
                    Carregando ideia...
                </Text>

            </View>

        );

    }


    if (!ideia) {

        return (

            <View style={styles.carregando}>

                <Text style={styles.textoCarregando}>
                    Ideia indisponível.
                </Text>

                <TouchableOpacity onPress={onVoltar}>
                    <Text style={styles.voltarTexto}>
                        Voltar
                    </Text>
                </TouchableOpacity>

            </View>

        );

    }


    return (

        <View style={styles.container}>

            {/* CABEÇALHO */}

            <View style={styles.header}>

                <TouchableOpacity
                    onPress={onVoltar}
                    style={styles.botaoVoltar}
                >

                    <Text style={styles.setaVoltar}>
                        ‹
                    </Text>

                </TouchableOpacity>


                <Text style={styles.headerTitulo}>
                    Detalhes da ideia
                </Text>

            </View>


            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.conteudo}
                keyboardShouldPersistTaps="handled"
            >

                {/* INFORMAÇÕES PRINCIPAIS */}

                <View style={styles.cardPrincipal}>

                    <Text style={styles.status}>
                        {obterStatus(ideia.status)}
                    </Text>

                    <Text style={styles.titulo}>
                        {ideia.title}
                    </Text>

                    <Text style={styles.autor}>
                        Criada por {nomeUsuario(ideia.profiles)}
                    </Text>

                    <View style={styles.divisor} />

                    <Text style={styles.descricao}>
                        {ideia.description}
                    </Text>

                    <Text style={styles.data}>
                        Criada em {formatarData(ideia.created_at)}
                    </Text>

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
                                    aba === item.id && styles.abaTextoAtiva
                                ]}
                            >
                                {item.titulo}
                            </Text>

                        </TouchableOpacity>

                    ))}

                </View>


                {/* VISÃO GERAL */}

                {aba === 'visao' && (

                    <View>

                        <Text style={styles.secaoTitulo}>
                            Colaboradores
                        </Text>

                        {colaboradores.length > 0 ? (

                            colaboradores.map(item => (

                                <View
                                    key={item.id}
                                    style={styles.item}
                                >

                                    <Text style={styles.itemTitulo}>
                                        {nomeUsuario(item.profiles)}
                                    </Text>

                                    <Text style={styles.itemDescricao}>
                                        Colaborador autorizado
                                    </Text>

                                </View>

                            ))

                        ) : (

                            <Text style={styles.vazio}>
                                Ainda não há colaboradores.
                            </Text>

                        )}


                        <View style={styles.tituloContribuicoes}>

                            <Text style={styles.secaoTitulo}>
                                Contribuições
                            </Text>

                            <TouchableOpacity
                                style={styles.botaoContribuir}
                                onPress={() => setMostrarFormulario(!mostrarFormulario)}
                            >

                                <Text style={styles.botaoContribuirTexto}>
                                    {mostrarFormulario ? 'Cancelar' : '+ Contribuir'}
                                </Text>

                            </TouchableOpacity>

                        </View>


                        {mostrarFormulario && (

                            <View style={styles.formulario}>

                                <Text style={styles.formularioTitulo}>
                                    Sua contribuição
                                </Text>

                                <Text style={styles.formularioDescricao}>
                                    Compartilhe uma sugestão ou melhoria para esta ideia.
                                </Text>

                                <TextInput
                                    style={styles.campoContribuicao}
                                    placeholder="Escreva sua contribuição..."
                                    placeholderTextColor={CORES.secundario}
                                    value={textoContribuicao}
                                    onChangeText={setTextoContribuicao}
                                    multiline
                                    textAlignVertical="top"
                                    editable={!enviando}
                                    maxLength={3000}
                                />

                                <Text style={styles.contador}>
                                    {textoContribuicao.length}/3000
                                </Text>

                                <TouchableOpacity
                                    style={[
                                        styles.botaoEnviar,
                                        enviando && styles.botaoDesabilitado
                                    ]}
                                    onPress={enviarContribuicao}
                                    disabled={enviando}
                                >

                                    {enviando ? (

                                        <ActivityIndicator
                                            color={CORES.texto}
                                        />

                                    ) : (

                                        <Text style={styles.botaoEnviarTexto}>
                                            Enviar contribuição
                                        </Text>

                                    )}

                                </TouchableOpacity>

                            </View>

                        )}


                        {contribuicoes.length > 0 ? (

                            contribuicoes.map(item => (

                                <View
                                    key={item.id}
                                    style={styles.item}
                                >

                                    <Text style={styles.itemTitulo}>
                                        {nomeUsuario(item.profiles)}
                                    </Text>

                                    <Text style={styles.itemDescricao}>
                                        {item.content}
                                    </Text>

                                    <Text style={styles.data}>
                                        {formatarData(item.created_at)}
                                    </Text>

                                    <TouchableOpacity
    style={styles.botaoRamificacao}
    onPress={() => setContribuicaoRamificacao(
        contribuicaoRamificacao === item.id ? null : item.id
    )}
>
    <Text style={styles.botaoRamificacaoTexto}>
        {contribuicaoRamificacao === item.id
            ? 'Cancelar'
            : '+ Criar outro caminho'}
    </Text>
</TouchableOpacity>


{contribuicaoRamificacao === item.id && (

    <View style={styles.formulario}>

        <Text style={styles.formularioTitulo}>
            Novo caminho
        </Text>

        <TextInput
            style={styles.campoTitulo}
            placeholder="Título da ramificação"
            placeholderTextColor={CORES.secundario}
            value={tituloRamificacao}
            onChangeText={setTituloRamificacao}
            maxLength={120}
            editable={!criandoRamificacao}
        />

        <TextInput
            style={styles.campoContribuicao}
            placeholder="Descreva este novo caminho..."
            placeholderTextColor={CORES.secundario}
            value={descricaoRamificacao}
            onChangeText={setDescricaoRamificacao}
            multiline
            textAlignVertical="top"
            editable={!criandoRamificacao}
            maxLength={3000}
        />

        <TouchableOpacity
            style={styles.botaoEnviar}
            onPress={enviarRamificacao}
            disabled={criandoRamificacao}
        >

            {criandoRamificacao ? (

                <ActivityIndicator color="#FFFFFF" />

            ) : (

                <Text style={styles.botaoEnviarTexto}>
                    Criar ramificação
                </Text>

            )}

        </TouchableOpacity>

    </View>

)}

                                </View>

                            ))

                        ) : (

                            <Text style={styles.vazio}>
                                Ainda não há contribuições.
                            </Text>

                        )}

                    </View>

                )}


                {/* EVOLUÇÃO */}

                {aba === 'evolucao' && (

                    <View>

                        <Text style={styles.secaoTitulo}>
                            Ramificações
                        </Text>

                        {ramificacoes.length > 0 ? (

                            ramificacoes.map(item => (

                                <View
                                    key={item.id}
                                    style={styles.item}
                                >

                                    <Text style={styles.itemTitulo}>
                                        {item.title}
                                    </Text>

                                    <Text style={styles.itemDescricao}>
                                        {item.description}
                                    </Text>

                                    <Text style={styles.itemAutor}>
                                        Criada por {nomeUsuario(item.profiles)}
                                    </Text>

                                </View>

                            ))

                        ) : (

                            <Text style={styles.vazio}>
                                Esta ideia ainda não possui ramificações.
                            </Text>

                        )}

                    </View>

                )}


                {/* VERSÕES */}

                {aba === 'versoes' && (

                    <View>

                        <Text style={styles.secaoTitulo}>
                            Histórico de versões
                        </Text>

                        {versoes.length > 0 ? (

                            versoes.map(item => (

                                <View
                                    key={item.id}
                                    style={styles.item}
                                >

                                    <Text style={styles.versaoNumero}>
                                        v{item.major_version}.{item.minor_version}
                                    </Text>

                                    <Text style={styles.itemTitulo}>
                                        {item.title}
                                    </Text>

                                    <Text style={styles.itemDescricao}>
                                        {item.description}
                                    </Text>

                                    {item.change_summary ? (

                                        <Text style={styles.resumo}>
                                            {item.change_summary}
                                        </Text>

                                    ) : null}

                                    <Text style={styles.data}>
                                        Publicada por {nomeUsuario(item.profiles)}
                                        {' • '}
                                        {formatarData(item.created_at)}
                                    </Text>

                                </View>

                            ))

                        ) : (

                            <Text style={styles.vazio}>
                                Nenhuma versão publicada ainda.
                            </Text>

                        )}

                    </View>

                )}

                <View style={{ height: 35 }} />

            </ScrollView>

        </View>

    );

}


// ESTILOS

const styles = StyleSheet.create({

    botaoRamificacao: {
    marginTop: 14,
    alignSelf: 'flex-start'
},

botaoRamificacaoTexto: {
    color: CORES.destaque,
    fontSize: 11,
    fontWeight: '700'
},

campoTitulo: {
    backgroundColor: CORES.fundo,
    borderWidth: 1,
    borderColor: CORES.borda,
    borderRadius: 10,
    padding: 12,
    color: CORES.texto,
    fontSize: 12,
    marginTop: 12
},

    container: {
        flex: 1,
        backgroundColor: CORES.fundo
    },

    carregando: {
        flex: 1,
        backgroundColor: CORES.fundo,
        alignItems: 'center',
        justifyContent: 'center'
    },

    textoCarregando: {
        color: CORES.secundario,
        marginTop: 12,
        fontSize: 13
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 55,
        paddingBottom: 20
    },

    botaoVoltar: {
        width: 35,
        height: 35,
        justifyContent: 'center'
    },

    setaVoltar: {
        color: CORES.texto,
        fontSize: 35
    },

    headerTitulo: {
        color: CORES.texto,
        fontSize: 17,
        fontWeight: '700',
        marginLeft: 10
    },

    conteudo: {
        paddingHorizontal: 18
    },

    cardPrincipal: {
        backgroundColor: CORES.card,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: CORES.borda
    },

    status: {
        color: CORES.destaque,
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 12
    },

    titulo: {
        color: CORES.texto,
        fontSize: 22,
        fontWeight: '800'
    },

    autor: {
        color: CORES.secundario,
        fontSize: 11,
        marginTop: 9
    },

    divisor: {
        height: 1,
        backgroundColor: CORES.borda,
        marginVertical: 17
    },

    descricao: {
        color: CORES.texto,
        fontSize: 13,
        lineHeight: 21
    },

    data: {
        color: CORES.secundario,
        fontSize: 10,
        marginTop: 12
    },

    abas: {
        flexDirection: 'row',
        marginTop: 22,
        borderBottomWidth: 1,
        borderBottomColor: CORES.borda
    },

    aba: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent'
    },

    abaAtiva: {
        borderBottomColor: CORES.destaque
    },

    abaTexto: {
        color: CORES.secundario,
        fontSize: 11,
        fontWeight: '600'
    },

    abaTextoAtiva: {
        color: CORES.destaque
    },

    secaoTitulo: {
        color: CORES.texto,
        fontSize: 16,
        fontWeight: '800',
        marginTop: 23,
        marginBottom: 13
    },

    tituloContribuicoes: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    botaoContribuir: {
        backgroundColor: CORES.destaque,
        paddingHorizontal: 13,
        paddingVertical: 9,
        borderRadius: 10,
        marginTop: 15
    },

    botaoContribuirTexto: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },

    formulario: {
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 15,
        padding: 16,
        marginBottom: 16
    },

    formularioTitulo: {
        color: CORES.texto,
        fontSize: 14,
        fontWeight: '700'
    },

    formularioDescricao: {
        color: CORES.secundario,
        fontSize: 11,
        marginTop: 7,
        marginBottom: 14
    },

    campoContribuicao: {
        minHeight: 110,
        backgroundColor: CORES.fundo,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 10,
        padding: 12,
        color: CORES.texto,
        fontSize: 12,
        lineHeight: 19
    },

    contador: {
        color: CORES.secundario,
        fontSize: 10,
        textAlign: 'right',
        marginTop: 7
    },

    botaoEnviar: {
        backgroundColor: CORES.destaque,
        borderRadius: 10,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 12
    },

    botaoDesabilitado: {
        opacity: 0.6
    },

    botaoEnviarTexto: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },

    item: {
        backgroundColor: CORES.card,
        borderWidth: 1,
        borderColor: CORES.borda,
        borderRadius: 15,
        padding: 16,
        marginBottom: 11
    },

    itemTitulo: {
        color: CORES.texto,
        fontSize: 13,
        fontWeight: '700'
    },

    itemDescricao: {
        color: CORES.secundario,
        fontSize: 12,
        lineHeight: 19,
        marginTop: 8
    },

    itemAutor: {
        color: CORES.destaque,
        fontSize: 10,
        marginTop: 12
    },

    versaoNumero: {
        color: CORES.destaque,
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 9
    },

    resumo: {
        color: CORES.texto,
        fontSize: 11,
        lineHeight: 18,
        marginTop: 12
    },

    vazio: {
        color: CORES.secundario,
        fontSize: 12,
        lineHeight: 19,
        marginBottom: 12
    },

    voltarTexto: {
        color: CORES.destaque,
        marginTop: 15
    }

});