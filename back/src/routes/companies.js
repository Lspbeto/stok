// Empresas: ADM Geral enxerga todas; ADM Empresarial apenas a própria.
const router=require("express").Router();
const Company=require("../models/Company");
const Movement=require("../models/Movement");
const Product=require("../models/Product");
const User=require("../models/User");
const {auth,isGeneralAdmin,adminOnly}=require("../middleware/auth");
function validCnpj(value){const n=String(value||"").replace(/\D/g,"");if(n.length!==14||/^(\d)\1{13}$/.test(n))return false;const calc=(s,w)=>{const sum=w.reduce((a,x,i)=>a+Number(s[i])*x,0),m=sum%11;return m<2?0:11-m;};const a=calc(n.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2]),b=calc(n.slice(0,12)+a,[6,5,4,3,2,9,8,7,6,5,4,3,2]);return n.endsWith(""+a+b);}
async function existsCnpj(cnpj){const response=await fetch("https://brasilapi.com.br/api/cnpj/v1/"+cnpj,{signal:AbortSignal.timeout(8000)});if(response.status===404)return false;if(!response.ok)throw new Error("Consulta cadastral indisponível.");const data=await response.json();return String(data.cnpj||"").replace(/\D/g,"")===cnpj;}
router.use(auth);
router.get("/summary",async(req,res,next)=>{
 try{
  if(!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode consultar o consolidado de empresas."});
  const companyId=String(req.query.companyId||"").trim();
  if(companyId&&!require("mongoose").isValidObjectId(companyId))return res.status(400).json({message:"Empresa selecionada inválida."});
  const company=companyId?await Company.findOne({_id:companyId,active:true}).select("name"):null;
  if(companyId&&!company)return res.status(404).json({message:"Empresa não encontrada ou inativa."});
  const companyScope=companyId?{companyId}:{};
  const companyFilter=companyId?{_id:companyId,active:true}:{active:true};
  const [companies,products,movements,users]=await Promise.all([
   Company.countDocuments(companyFilter),
   Product.countDocuments({...companyScope,active:true}),
   Movement.countDocuments(companyScope),
   User.countDocuments({...companyScope,active:true})
  ]);
  res.json({scope:companyId?"company":"all",companyName:company?.name||null,companies,products,movements,users});
 }catch(e){next(e);}
}});
router.get("/",async(req,res,next)=>{try{const filter=isGeneralAdmin(req.user)?{active:true}:{_id:req.user.companyId||null,active:true};res.json(await Company.find(filter).sort({name:1}));}catch(e){next(e);}});
router.post("/",adminOnly,async(req,res,next)=>{try{if(!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode cadastrar empresas."});const name=String(req.body.name||"").trim(),cnpj=String(req.body.cnpj||"").replace(/\D/g,"");if(!name||!cnpj)return res.status(400).json({message:"Informe nome e CNPJ."});const fictional=cnpj==="0000000000";if(!fictional){if(!validCnpj(cnpj))return res.status(400).json({message:"CNPJ inválido."});if(!await existsCnpj(cnpj))return res.status(404).json({message:"CNPJ não encontrado na consulta cadastral."});if(await Company.exists({cnpj,active:true}))return res.status(409).json({message:"CNPJ já cadastrado."});}const company=await Company.create({name,cnpj,isFictional:fictional});res.status(201).json(company);}catch(e){if(e.name==="TimeoutError"||e.name==="AbortError")return res.status(503).json({message:"Consulta do CNPJ indisponível; tente novamente."});next(e);}});
router.put("/:id",adminOnly,async(req,res,next)=>{try{if(!isGeneralAdmin(req.user)&&String(req.user.companyId)!==String(req.params.id))return res.status(403).json({message:"Você só pode alterar sua própria empresa."});const company=await Company.findOne({_id:req.params.id,active:true});if(!company)return res.status(404).json({message:"Empresa não encontrada."});if(req.body.name!==undefined)company.name=String(req.body.name).trim();await company.save();res.json(company);}catch(e){next(e);}});
router.delete("/:id",adminOnly,async(req,res,next)=>{try{if(!isGeneralAdmin(req.user))return res.status(403).json({message:"Somente ADM Geral pode desativar empresas."});const company=await Company.findOne({_id:req.params.id,active:true});if(!company)return res.status(404).json({message:"Empresa não encontrada."});company.active=false;await company.save();res.json({message:"Empresa desativada; histórico preservado."});}catch(e){next(e);}});
module.exports=router;
