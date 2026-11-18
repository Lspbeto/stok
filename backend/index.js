const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({path: path.join(__dirname, '.env')});

const app = express();

app.use(cors());
app.use(express.json());

const LINK_URL_BANCO = process.env.MONGO_URL
mongoose.connect(LINK_URL_BANCO)
.then(function() {
    console.log("Conexão com MongoDB estabelecida com sucesso!");
})
.catch(function(error) {
    console.error("Erro ao conectar com o MongoDB:", error);
})

const UsuarioSchema = new mongoose.Schema({
    usuario: {type: String, required: true},
    senha: {type: Number, required: true}
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

app.get('/estoque', function(req,res){
      then(function(listaUsuarios){
        return res.json(listaUsuarios)
    })
     .catch(function(error){
        return res.status(404).json({erro: "Erro ao buscar banco de dados:", error})
     });
});

app.post('/estoque', function(req,res){
    const Dadosrecebidos = req.body;
    Usuario.create({
        usuario: Dadosrecebidos.usuario,
        senha: Dadosrecebidos.senha

    })
    .then(function(NovoUsuario){
        return res.status(201).json(NovoUsuario)
    })
    .catch(function(erro){
        return res.status(400).json({erro: "Erro ao salvar o usuário no banco de dados:"})
    })
});

app.put('/estoque/:id', function(req,res) {
    const id = decodeURIComponent(req.params.id);
    const Dadosrecebidos = req.body;

    Usuario.findOneAndUpdate(
        {_id: id},
        { 
          Usuario: Dadosrecebidos.usuario,
          Senha: Dadosrecebidos.senha
        },
        {new: true}
    
    .then(function(UsuarioAtualizado) {
        return res.json(UsuarioAtualizado)
        console.log("Usuário atualizado com sucesso:", UsuarioAtualizado);
    })
    .catch(function(erro) {
        return res.status(400).json({erro: "Erro ao atualizar o usuário no banco de dados:", erro});

})

    )}

);

app.delete('/estoque/:id', function(req,res) {
    const id = decodeURIComponent(req.params.id);

    Usuario.findOneAndDelete(
        {_id: id},
        {
            Usuario: Dadosrecebidos.usuario,
            Senha: Dadosrecebidos.senha
        },
        {new: true}

        .then(function(UsuarioDeletado) {
            return res.json(UsuarioDeletado)
            console.log("Usuário deletado com sucesso:", UsuarioDeletado);
        })
        .catch(function(erro) {
            return res.status(400).json({erro: "Erro ao processar a exclusão do usuário no banco de dados:", erro});
        })
    )}

);
const PORT = process.env.PORT || 3000;
app.listen(PORT, function() {
    console.log(`Servidor rodando na porta ${PORT}`);
});