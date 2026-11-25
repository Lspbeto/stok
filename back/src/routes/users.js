// Administração de usuários com isolamento por empresa e hierarquia de perfis.
const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Company = require("../models/Company");
const Movement = require("../models/Movement");
const { auth, isGeneralAdmin, isCompanyAdmin, canAccessCompany } = require("../middleware/auth");
router.use(auth);
function safe(user) {
  return { id:user._id, name:user.name, email:user.email, registrationNumber:user.registrationNumber, isFictional:user.isFictional, role:user.role, sector:user.sector, companyId:user.companyId, active:user.active };
}
router.get("/", async (req,res,next)=>{
  try {
    const filter = isGeneralAdmin(req.user) ? {} : (req.user.companyId ? {companyId:req.user.companyId} : {_id:null});
    res.json((await User.find(filter).select("name email registrationNumber isFictional role sector companyId active createdAt").sort({name:1})).map(safe));
  } catch(e){next(e);}
});
router.post("/", async(req,res,next)=>{
  try {
    const {name,email,password,role="operador",sector="",registrationNumber="",companyId} = req.body;
    const normalizedEmail=String(email||"").toLowerCase().trim();
    if(!name||!normalizedEmail||!password||password.length<8) return res.status(400).json({message:"Informe nome, e-mail e senha com pelo menos 8 caracteres."});
    if(!registrationNumber) return res.status(400).json({message:"Informe o número de cadastro."});
    if(await User.exists({$or:[{email:normalizedEmail},{registrationNumber:String(registrationNumber).trim()}]})) return res.status(409).json({message:"E-mail ou número de cadastro já cadastrado."});
    if(["adm_geral","admin"].includes(role)) return res.status(403).json({message:"ADM Geral não pode ser criado pelo cadastro comum. O perfil é reservado aos e-mails autorizados."});
    if(!["adm_empresa","adm_setor","operador"].includes(role)) return res.status(400).json({message:"Perfil inválido."});
    if(role==="adm_empresa" && !isGeneralAdmin(req.user)) return res.status(403).json({message:"Somente ADM Geral pode criar ADM Empresarial."});
    const targetCompanyId=isGeneralAdmin(req.user)?companyId:req.user.companyId;
    if(!targetCompanyId || !await Company.exists({_id:targetCompanyId,active:true})) return res.status(400).json({message:"Selecione uma empresa válida para o usuário."});
    if(!isGeneralAdmin(req.user) && !canAccessCompany(req.user,targetCompanyId)) return res.status(403).json({message:"Acesso negado à empresa selecionada."});
    if(role==="operador" && !String(sector).trim()) return res.status(400).json({message:"Informe o setor do operador."});
    const user=await User.create({name,email:normalizedEmail,registrationNumber:String(registrationNumber).trim(),isFictional:String(registrationNumber).startsWith("0.0"),passwordHash:await bcrypt.hash(password,12),role,companyId:targetCompanyId,sector:String(sector||"").trim(),active:true});
    await Movement.create({companyId:targetCompanyId,action:"USUARIO_CRIADO",details:"Usuário "+user.email+" criado.",userId:req.user._id,userName:req.user.name,role:req.user.role});
    res.status(201).json(safe(user));
  }catch(e){if(e.code===11000)return res.status(409).json({message:"E-mail ou cadastro já utilizado."});next(e);}
});
router.put("/:id",async(req,res,next)=>{
  try{
    const target=await User.findById(req.params.id);
    if(!target)return res.status(404).json({message:"Usuário não encontrado."});
    if(!isGeneralAdmin(req.user)&&(!req.user.companyId||String(target.companyId)!==String(req.user.companyId)))return res.status(403).json({message:"Você só pode alterar usuários da sua empresa."});
    if(["adm_geral","admin"].includes(target.role)&&!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode alterar este usuário."});
    const allowed=["name","email","registrationNumber","sector","active"];
    for(const k of allowed)if(req.body[k]!==undefined)target[k]=k==="email"?String(req.body[k]).toLowerCase().trim():req.body[k];
    if(req.body.role!==undefined){
      if(!["adm_empresa","adm_setor","operador"].includes(req.body.role))return res.status(400).json({message:"Perfil inválido."});
      if(req.body.role==="adm_empresa"&&!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode atribuir ADM Empresarial."});
      target.role=req.body.role;
    }
    if(req.body.companyId!==undefined){
      if(!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode transferir usuários entre empresas."});
      if(!await Company.exists({_id:req.body.companyId,active:true}))return res.status(400).json({message:"Empresa inválida."});
      target.companyId=req.body.companyId;
    }
    if(req.body.password){if(req.body.password.length<8)return res.status(400).json({message:"A senha deve ter pelo menos 8 caracteres."});target.passwordHash=await bcrypt.hash(req.body.password,12);}
    await target.save();
    res.json(safe(target));
  }catch(e){next(e);}
});
router.delete("/:id",async(req,res,next)=>{
  try{
    const target=await User.findById(req.params.id);
    if(!target)return res.status(404).json({message:"Usuário não encontrado."});
    if(!isGeneralAdmin(req.user)&&(!req.user.companyId||String(target.companyId)!==String(req.user.companyId)))return res.status(403).json({message:"Você só pode desativar usuários da sua empresa."});
    if(["adm_geral","admin"].includes(target.role))return res.status(403).json({message:"ADM Geral não pode ser excluído por esta função."});
    target.active=false;await target.save();
    res.json({message:"Usuário desativado; histórico preservado."});
  }catch(e){next(e);}
});
module.exports=router;
