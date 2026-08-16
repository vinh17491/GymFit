import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { Building2, CheckCircle2, Clock3, FileText, MapPin, Save, Send, Store, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { sellerApplicationsApi } from '../../services/sellerApplicationsApi';
import { useAuthStore } from '../../stores/authStore';
import type { SellerApplication, SellerApplicationInput, SellerBusinessType } from '../../types/sellerApplications';

type FormState = Record<'businessName'|'businessType'|'contactName'|'contactEmail'|'contactPhone'|'businessAddress'|'pickupAddress'|'taxCode'|'websiteUrl'|'socialUrl'|'description', string>;
const empty: FormState = { businessName:'',businessType:'',contactName:'',contactEmail:'',contactPhone:'',businessAddress:'',pickupAddress:'',taxCode:'',websiteUrl:'',socialUrl:'',description:'' };
const required: Array<keyof FormState> = ['businessName','businessType','contactName','contactEmail','contactPhone','businessAddress','pickupAddress'];
const labels: Record<keyof FormState,string> = {
  businessName:'Tên doanh nghiệp',businessType:'Loại hình',contactName:'Người liên hệ',contactEmail:'Email liên hệ',
  contactPhone:'Số điện thoại',businessAddress:'Địa chỉ doanh nghiệp',pickupAddress:'Địa chỉ lấy hàng',
  taxCode:'Mã số thuế (không bắt buộc)',websiteUrl:'Website (không bắt buộc)',socialUrl:'Mạng xã hội (không bắt buộc)',
  description:'Giới thiệu doanh nghiệp (không bắt buộc)',
};

function fromApplication(application: SellerApplication): FormState {
  return Object.fromEntries(Object.keys(empty).map(key => [key, String(application[key as keyof SellerApplication] ?? '')])) as FormState;
}
function payload(form: FormState): SellerApplicationInput {
  return {
    businessName:form.businessName.trim()||null,businessType:(form.businessType||null) as SellerBusinessType|null,
    contactName:form.contactName.trim()||null,contactEmail:form.contactEmail.trim()||null,contactPhone:form.contactPhone.trim()||null,
    businessAddress:form.businessAddress.trim()||null,pickupAddress:form.pickupAddress.trim()||null,taxCode:form.taxCode.trim()||null,
    websiteUrl:form.websiteUrl.trim()||null,socialUrl:form.socialUrl.trim()||null,description:form.description.trim()||null,
  };
}
function errorMessage(error: unknown) {
  return error instanceof AxiosError && typeof error.response?.data?.message === 'string'
    ? error.response.data.message : 'Không thể xử lý hồ sơ người bán.';
}

export default function SellerApplicationPage() {
  const user=useAuthStore(state=>state.user);
  const [application,setApplication]=useState<SellerApplication|null>(null);
  const [form,setForm]=useState<FormState>(empty);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const eligible=user?.role==='member'||user?.role==='seller';
  useEffect(()=>{if(!eligible){setLoading(false);return}setLoading(true);sellerApplicationsApi.mine().then(response=>{setApplication(response.data.data);setForm(fromApplication(response.data.data));}).catch((requestError:unknown)=>{if(requestError instanceof AxiosError&&requestError.response?.status===404){setApplication(null);setForm(current=>({...current,contactName:user?.name||'',contactEmail:user?.email||'',contactPhone:user?.phone||''}));}else setError(errorMessage(requestError));}).finally(()=>setLoading(false));},[eligible,user?.email,user?.name,user?.phone]);
  const editable=!application||['DRAFT','REJECTED','WITHDRAWN'].includes(application.status);
  const missing=useMemo(()=>required.filter(key=>!form[key].trim()),[form]);
  const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim());
  const save=async()=>{setSaving(true);setError('');try{const response=application?await sellerApplicationsApi.update(payload(form)):await sellerApplicationsApi.create(payload(form));setApplication(response.data.data);setForm(fromApplication(response.data.data));toast.success('Đã lưu bản nháp.');return response.data.data;}catch(requestError){setError(errorMessage(requestError));return null;}finally{setSaving(false)}};
  const onSave=(event:FormEvent)=>{event.preventDefault();void save();};
  const submit=async()=>{if(missing.length||!validEmail){setError('Vui lòng hoàn tất các trường bắt buộc và nhập email hợp lệ trước khi gửi.');return}if(!window.confirm('Gửi hồ sơ để Admin xét duyệt? Hồ sơ sẽ khóa chỉnh sửa khi đang chờ.'))return;setSaving(true);setError('');try{let current=application;if(!current)current=(await sellerApplicationsApi.create(payload(form))).data.data;else current=(await sellerApplicationsApi.update(payload(form))).data.data;const response=await sellerApplicationsApi.submit();setApplication(response.data.data);setForm(fromApplication(response.data.data));toast.success('Hồ sơ đã được gửi xét duyệt.');}catch(requestError){setError(errorMessage(requestError));}finally{setSaving(false)}};
  const withdraw=async()=>{if(!window.confirm('Rút hồ sơ đang chờ xét duyệt?'))return;setSaving(true);try{const response=await sellerApplicationsApi.withdraw();setApplication(response.data.data);setForm(fromApplication(response.data.data));toast.success('Đã rút hồ sơ.');}catch(requestError){setError(errorMessage(requestError));}finally{setSaving(false)}};

  const pending=application?.status==='PENDING';

  const renderField=(key:keyof FormState,wide=false)=>{
    const id=`seller-application-${key}`;
    const fieldClass=wide?'md:col-span-2':'';
    return <label key={key} className={`label ${fieldClass}`} htmlFor={id}>
      {labels[key]}{required.includes(key)&&<span className="ml-1 text-lime-300" aria-hidden="true">*</span>}
      {key==='businessType'?<select id={id} disabled={!editable||saving} className="input-field mt-2" value={form[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}><option value="">Chọn loại hình</option><option value="BRAND">Thương hiệu</option><option value="SPORTS_STORE">Cửa hàng thể thao</option><option value="SMALL_BUSINESS">Doanh nghiệp nhỏ</option><option value="OTHER">Khác</option></select>:key==='description'?<><textarea id={id} disabled={!editable||saving} rows={5} maxLength={2000} className="input-field mt-2" value={form[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/><span className="form-hint mt-2 block text-right">{form.description.length}/2.000 ký tự</span></>:<input id={id} disabled={!editable||saving} type={key==='contactEmail'?'email':key.includes('Url')?'url':'text'} maxLength={key==='contactEmail'?255:key.includes('Address')||key.includes('Url')?500:key==='taxCode'||key==='contactPhone'?50:200} className="input-field mt-2" value={form[key]} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/>}
    </label>;
  };

  if(loading)return <div className="grid min-h-64 place-items-center text-slate-400">Đang tải Kênh người bán…</div>;
  if(!eligible)return <section className="mx-auto max-w-3xl"><div className="warning-panel p-6 sm:p-8"><Store className="mb-5 text-amber-300" size={30}/><h1 className="text-2xl font-bold">Kênh người bán</h1><p className="mt-3 leading-7 text-amber-100">Chỉ tài khoản Member có thể tạo hồ sơ Seller. Tài khoản {user?.role?.toUpperCase()} hiện không đủ điều kiện.</p></div></section>;
  if(application?.status==='APPROVED'||user?.role==='seller')return <section className="mx-auto max-w-3xl"><div className="success-panel p-6 sm:p-8"><CheckCircle2 className="mb-5 text-emerald-300" size={34}/><p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Approved</p><h1 className="mt-2 text-3xl font-bold">Tài khoản Seller đã được phê duyệt</h1><p className="mt-3 leading-7 text-slate-300">Phiên đăng nhập cũ đã bị thu hồi khi phê duyệt. Shop onboarding sẽ được triển khai trong SELLER-002.</p><Link className="btn-primary mt-6" to="/seller">Mở Seller workspace</Link></div></section>;

  return <section className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">Kênh người bán</p><h1 className="page-title mt-2">Hồ sơ đăng ký Seller</h1><p className="page-subtitle">Lưu bản nháp trước, sau đó chủ động gửi xét duyệt.</p></div>
      <span className="w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold tracking-wide text-slate-300">{application?.status||'DRAFT'}</span>
    </header>

    {error&&<p role="alert" className="danger-panel p-4 text-sm text-red-200">{error}</p>}
    {application?.status==='REJECTED'&&<div className="danger-panel p-5"><strong className="text-red-100">Hồ sơ bị từ chối</strong><p className="mt-3 text-sm font-semibold text-red-100">Lý do từ chối</p><p className="mt-1 whitespace-pre-wrap leading-6 text-slate-200">{application.reviewReason?.trim()||'Admin chưa cung cấp lý do chi tiết.'}</p><p className="mt-3 text-sm text-slate-300">Bạn có thể cập nhật hồ sơ và gửi lại để xét duyệt.</p><p className="mt-1 text-sm text-slate-400">Lý do từ chối trước đó vẫn được lưu trong lịch sử trạng thái.</p></div>}
    {application?.status==='WITHDRAWN'&&<div className="warning-panel p-5 text-amber-100">Hồ sơ đã rút. Bạn có thể chỉnh sửa và gửi lại cùng hồ sơ này.</div>}
    {pending&&<div className="info-panel flex gap-3 p-5"><Clock3 className="mt-0.5 shrink-0 text-blue-300" size={20}/><div><strong className="text-blue-100">Đang chờ xét duyệt</strong><p className="mt-2 text-sm leading-6 text-slate-300">Đã gửi {application.submittedAt?new Date(application.submittedAt).toLocaleString('vi-VN'):'—'}. Hồ sơ đang ở chế độ chỉ đọc.</p></div></div>}

    <form onSubmit={onSave} className="surface-panel overflow-hidden p-0">
      <section className="form-section sm:p-7">
        <div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-300/10 text-lime-300"><Building2 size={18}/></span><div><h2 className="font-semibold text-white">Thông tin doanh nghiệp</h2><p className="mt-1 text-sm text-slate-400">Thông tin pháp lý và loại hình hoạt động của đơn vị.</p></div></div>
        <div className="grid gap-5 md:grid-cols-2">{renderField('businessName')}{renderField('businessType')}{renderField('taxCode')}</div>
      </section>
      <section className="form-section sm:p-7">
        <div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-400/10 text-blue-300"><User size={18}/></span><div><h2 className="font-semibold text-white">Thông tin liên hệ</h2><p className="mt-1 text-sm text-slate-400">Đầu mối để GymFit trao đổi trong quá trình xét duyệt.</p></div></div>
        <div className="grid gap-5 md:grid-cols-2">{renderField('contactName')}{renderField('contactEmail')}{renderField('contactPhone')}</div>
      </section>
      <section className="form-section sm:p-7">
        <div className="mb-5 flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-400/10 text-amber-300"><MapPin size={18}/></span><div><h2 className="font-semibold text-white">Vận hành và hiện diện</h2><p className="mt-1 text-sm text-slate-400">Địa chỉ lấy hàng, kênh trực tuyến và phần giới thiệu doanh nghiệp.</p></div></div>
        <div className="grid gap-5 md:grid-cols-2">{renderField('businessAddress',true)}{renderField('pickupAddress',true)}{renderField('websiteUrl')}{renderField('socialUrl')}{renderField('description',true)}</div>
      </section>
      <div className="form-actions flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-sm text-slate-400">{missing.length?`Còn ${missing.length} trường bắt buộc chưa hoàn tất.`:validEmail?'Hồ sơ đã đủ trường bắt buộc để gửi xét duyệt.':'Vui lòng kiểm tra lại email liên hệ.'}</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">{pending&&<button disabled={saving} className="btn-secondary" type="button" onClick={()=>void withdraw()}>Rút hồ sơ</button>}{editable&&<><button disabled={saving} className="btn-secondary" type="submit"><Save size={16}/>{saving?'Đang lưu…':'Lưu bản nháp'}</button><button disabled={saving} className="btn-primary" type="button" onClick={()=>void submit()}><Send size={16}/>Gửi xét duyệt</button></>}</div>
      </div>
    </form>

    {application&&<section className="surface-panel p-5 sm:p-6"><div className="flex items-center gap-2"><FileText className="text-lime-300" size={18}/><h2 className="text-lg font-semibold">Lịch sử trạng thái</h2></div><ol className="mt-5 space-y-4">{application.history.map(item=><li key={item.id} className="border-l-2 border-lime-300/40 pl-4"><strong className="text-sm text-slate-100">{item.fromStatus||'Mới'} → {item.toStatus}</strong><p className="mt-1 text-sm text-slate-400">{new Date(item.createdAt).toLocaleString('vi-VN')} · {item.actorName||'System'}</p>{item.reason&&<p className="mt-1 text-sm text-red-200">{item.reason}</p>}</li>)}</ol></section>}
  </section>;
}
