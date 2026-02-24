from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from utils.notify import notify_user
from database import get_db
from models.models import User, Student, FeeRecord, FeeStatus, OfflinePaymentRequest, RequestStatus, UserRole
from auth.dependencies import get_current_user, require_admin
from pydantic import BaseModel
from typing import Optional
from models.models import Notification
from datetime import datetime
import hashlib
import hmac
import uuid

router = APIRouter(prefix="/payments", tags=["Payments"])

class OfflineRequestCreate(BaseModel):
    month: int
    year: int
    amount: float
    admin_id: int
    paid_date: Optional[str] = None
    payment_type: str = "cash"


class OfflineRequestAction(BaseModel):
    reason: Optional[str] = None

class AdminDirectEntry(BaseModel):
    student_id: int  # admin enters the student's ID
    month: int
    year: int
    amount: float
    
class OnlinePaymentCreate(BaseModel):
    month: int
    year: int
    amount: float

class OnlinePaymentVerify(BaseModel):
    order_id: str
    payment_id: str
    month: int
    year: int
    amount: float

@router.post("/online/create-order")
def create_order(
    data: OnlinePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Check if already paid
    existing = db.query(FeeRecord).filter(
        FeeRecord.student_id == student.id,
        FeeRecord.month == data.month,
        FeeRecord.year == data.year
    ).first()
    if existing and existing.status in [FeeStatus.paid_online, FeeStatus.paid_offline]:
        raise HTTPException(status_code=409, detail="Fee already paid for this month")

    # Simulate order creation (replace with real Razorpay call later)
    order_id = f"order_{uuid.uuid4().hex[:16]}"
    return {
        "order_id": order_id,
        "amount": data.amount,
        "currency": "INR",
        "month": data.month,
        "year": data.year
    }

@router.post("/online/verify")
def verify_payment(
    data: OnlinePaymentVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Simulate verification (replace with HMAC signature check later)
    if not data.payment_id.startswith("pay_"):
        raise HTTPException(status_code=400, detail="Invalid payment")

    # Update or create fee record
    fee = db.query(FeeRecord).filter(
        FeeRecord.student_id == student.id,
        FeeRecord.month == data.month,
        FeeRecord.year == data.year
    ).first()
    if fee:
        fee.status = FeeStatus.paid_online
        fee.amount = data.amount
        fee.payment_type = "online"
        fee.paid_at = datetime.utcnow()
    else:
        fee = FeeRecord(
            student_id=student.id,
            month=data.month,
            year=data.year,
            status=FeeStatus.paid_online,
            payment_type="online",
            amount=data.amount,
            paid_at=datetime.utcnow()
        )
        db.add(fee)

    notify_user(
        db,
        user_id=current_user.id,
        message=f"Online payment of Rs.{data.amount} for {data.month}/{data.year} successful",
        triggered_by=current_user.id,
        push_title="Payment Successful",
        push_url="/fees"
    )
    db.commit()
    return {"message": "Payment verified", "status": "paid_online"}

@router.post("/offline/request")
def create_offline_request(data: OfflineRequestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Get student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    # Verify admin belongs to same branch
    admin = db.query(User).filter(User.id == data.admin_id, User.branch_id == current_user.branch_id).first()
    if not admin or admin.role not in [UserRole.admin, UserRole.super_admin]:
        raise HTTPException(status_code=400, detail="Invalid admin for your branch")
    # Check if already paid
    existing_fee = db.query(FeeRecord).filter(
        FeeRecord.student_id == student.id,
        FeeRecord.month == data.month,
        FeeRecord.year == data.year
    ).first()
    if existing_fee and existing_fee.status in [FeeStatus.paid_online, FeeStatus.paid_offline]:
        raise HTTPException(status_code=409, detail="Fee already paid for this month")
    # Check if pending request already exists
    existing_request = db.query(OfflinePaymentRequest).filter(
        OfflinePaymentRequest.student_id == student.id,
        OfflinePaymentRequest.month == data.month,
        OfflinePaymentRequest.year == data.year,
        OfflinePaymentRequest.status == RequestStatus.pending
    ).first()
    if existing_request:
        raise HTTPException(status_code=409, detail="Pending request already exists for this month")
    request = OfflinePaymentRequest(
        student_id=student.id,
        admin_id=data.admin_id,
        month=data.month,
        year=data.year,
        amount=data.amount,
        status=RequestStatus.pending,
        payment_type=data.payment_type  

    )
    db.add(request)
    db.commit()
    db.refresh(request)

    notify_user(
        db,
        user_id=data.admin_id,
        message=f"New offline payment request from {student.full_name} for {data.month}/{data.year} — Rs.{data.amount}",
        triggered_by=current_user.id,
        push_title="New Payment Request",
        push_url="/admin/dashboard"
    )
    return request

@router.get("/offline/pending")
def get_pending_requests(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    return db.query(OfflinePaymentRequest).join(Student).join(User).filter(
        User.branch_id == current_user.branch_id,
        OfflinePaymentRequest.status == RequestStatus.pending
    ).all()

@router.patch("/offline/{id}/approve")
def approve_offline_request(id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    request = db.query(OfflinePaymentRequest).filter(OfflinePaymentRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    # Verify request belongs to admin's branch
    student = db.query(Student).join(User).filter(
        Student.id == request.student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=403, detail="Access denied")
    request.status = RequestStatus.approved
    # Update or create fee record
    fee = db.query(FeeRecord).filter(
        FeeRecord.student_id == request.student_id,
        FeeRecord.month == request.month,
        FeeRecord.year == request.year
    ).first()
    if fee:
        fee.status = FeeStatus.paid_offline
        fee.amount = request.amount
        fee.payment_type = request.payment_type  # was "cash"
        fee.paid_at = datetime.strptime(request.paid_date, "%Y-%m-%d") if request.paid_date else datetime.utcnow()
    else:
        fee = FeeRecord(
            student_id=request.student_id,
            month=request.month,
            year=request.year,
            status=FeeStatus.paid_offline,
            payment_type=request.payment_type,  # was "cash"
            amount=request.amount,
            paid_at=datetime.strptime(request.paid_date, "%Y-%m-%d") if request.paid_date else datetime.utcnow()
        )
        db.add(fee)
    notify_user(
        db,
        user_id=student.user_id,
        message=f"Your {request.payment_type} payment of Rs.{request.amount} for {request.month}/{request.year} has been approved",
        triggered_by=current_user.id,
        push_title="Payment Approved",
        push_url="/fees"
    )
    db.commit()
    return {"message": "Payment approved", "request_id": id}

@router.patch("/offline/{id}/reject")
def reject_offline_request(id: int, data: OfflineRequestAction, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    request = db.query(OfflinePaymentRequest).filter(OfflinePaymentRequest.id == id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    student = db.query(Student).join(User).filter(
        Student.id == request.student_id,
        User.branch_id == current_user.branch_id
    ).first()
    if not student:
        raise HTTPException(status_code=403, detail="Access denied")
    request.status = RequestStatus.rejected
    # Update fee record status
    fee = db.query(FeeRecord).filter(
        FeeRecord.student_id == request.student_id,
        FeeRecord.month == request.month,
        FeeRecord.year == request.year
    ).first()
    if fee:
        fee.status = FeeStatus.rejected
    notify_user(
        db,
        user_id=student.user_id,
        message=f"Your {request.payment_type} payment request for {request.month}/{request.year} was rejected",
        triggered_by=current_user.id,
        push_title="Payment Rejected",
        push_url="/fees"
    )
    db.commit()
    return {"message": "Payment rejected", "reason": data.reason}

@router.get("/offline/my-requests")
def get_my_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return []
    return db.query(OfflinePaymentRequest).filter(
        OfflinePaymentRequest.student_id == student.id,
        OfflinePaymentRequest.status == RequestStatus.pending
    ).all()

@router.patch("/offline/{id}/cancel")
def cancel_request(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    request = db.query(OfflinePaymentRequest).filter(
        OfflinePaymentRequest.id == id,
        OfflinePaymentRequest.student_id == student.id,
        OfflinePaymentRequest.status == RequestStatus.pending
    ).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found or cannot be cancelled")
    request.status = RequestStatus.rejected
    db.commit()
    return {"message": "Request cancelled"}