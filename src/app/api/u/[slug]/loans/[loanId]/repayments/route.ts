import { NextResponse } from "next/server";
import { defaultSettings, previewRepayment, type CalculatorSettingsInput } from "@/lib/debt";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: { slug: string; loanId: string } }) {
try{
const body=await request.json();
const amount=Math.round(Number(body.amount)||0);
if(amount<=0)return NextResponse.json({error:"還款金額必須大於0"},{status:400});
const owner=await prisma.owner.findUnique({where:{slug:params.slug},include:{settings:true}});
if(!owner||!owner.isActive)return NextResponse.json({error:"找不到頁面"},{status:404});
const loan=await prisma.loan.findFirst({where:{id:params.loanId,ownerId:owner.id},include:{repayments:{orderBy:{paymentDate:'desc'},take:1}}});
if(!loan)return NextResponse.json({error:"找不到案件"},{status:404});
const settings:CalculatorSettingsInput=owner.settings?{interestPer10000For30Days:owner.settings.interestPer10000For30Days,periodDays:owner.settings.periodDays,normalPreDeductPeriods:owner.settings.normalPreDeductPeriods,specialPreDeductPeriods:owner.settings.specialPreDeductPeriods,vehicleFee:owner.settings.vehicleFee,goldFixedLoanAmount:owner.settings.goldFixedLoanAmount,roundingMode:'round'}:defaultSettings;
const payDate=new Date(String(body.paymentDate)+'T00:00:00');
const baseDate=loan.repayments.length?loan.repayments[0].paymentDate:loan.startDate;
const daysElapsed=Math.max(0,Math.ceil((payDate.getTime()-baseDate.getTime())/86400000));
const preview=previewRepayment(loan.principalRemaining,amount,settings,daysElapsed);
const repayment=await prisma.$transaction(async(tx)=>{const saved=await tx.repayment.create({data:{ownerId:owner.id,loanId:loan.id,paymentDate:payDate,amount,principalBefore:preview.principalBefore,interestDue:preview.interestDue,interestPaid:preview.interestPaid,principalPaid:preview.principalPaid,principalAfter:preview.principalAfter,note:String(body.note??'').trim()||null}});await tx.loan.update({where:{id:loan.id},data:{principalRemaining:preview.principalAfter,status:preview.principalAfter===0?'closed':'active'}});return saved;});
return NextResponse.json({repayment});
}catch(error){console.error(error);return NextResponse.json({error:'儲存還款失敗'},{status:500});}
}
