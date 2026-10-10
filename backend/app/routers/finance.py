from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.orders import CustomerOrder
from app.models.finance import Expense, Payment, PaymentStatus
from app.schemas.finance import (
    ExpenseCreate,
    ExpenseResponse,
    PaymentCreate,
    PaymentResponse,
    OrderCostSummaryResponse
)

router = APIRouter(prefix="/finance", tags=["Costs & Finance"])

@router.get("/order-summaries", response_model=List[OrderCostSummaryResponse])
def get_order_cost_summaries(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """
    Detailed cost and profitability breakdown per customer order:
    - Total Revenue
    - Estimated Raw Material Costs (0.25 kg yarn/m @ $3.50/kg)
    - Direct Linked Expenses (dyes, chemicals, labour, maintenance)
    - Total Cost, Gross Profit, and Gross Margin %
    - Buyer Payments Received and Outstanding Balance Due
    """
    orders = db.query(CustomerOrder).order_by(CustomerOrder.created_at.desc()).all()
    results = []

    for ord in orders:
        # Standard conversion: 0.25 kg yarn per metre fabric @ $3.50/kg
        est_material_cost = round(ord.quantity_metres * 0.25 * 3.50, 2)

        # Linked direct expenses
        direct_expenses = sum(e.amount for e in ord.expenses)

        total_cost = round(est_material_cost + direct_expenses, 2)
        gross_profit = round(ord.total_revenue - total_cost, 2)
        gross_margin_pct = (
            round((gross_profit / ord.total_revenue) * 100.0, 1)
            if ord.total_revenue > 0
            else 0.0
        )

        total_paid = sum(p.amount for p in ord.payments if p.status == PaymentStatus.received)
        balance_due = max(0.0, round(ord.total_revenue - total_paid, 2))

        if balance_due == 0.0 and total_paid > 0:
            fin_status = "Paid in Full"
        elif total_paid > 0:
            fin_status = "Partially Paid"
        else:
            fin_status = "Unpaid"

        results.append(OrderCostSummaryResponse(
            order_id=ord.id,
            order_number=ord.order_number,
            buyer_name=ord.buyer.company_name if ord.buyer else "N/A",
            fabric_type=ord.fabric_type,
            ordered_metres=ord.quantity_metres,
            unit_price=ord.unit_price,
            total_revenue=ord.total_revenue,
            material_cost=est_material_cost,
            expenses_cost=round(direct_expenses, 2),
            total_cost=total_cost,
            gross_profit=gross_profit,
            gross_margin_pct=gross_margin_pct,
            total_paid=round(total_paid, 2),
            balance_due=balance_due,
            financial_status=fin_status
        ))

    return results

@router.get("/expenses", response_model=List[ExpenseResponse])
def list_expenses(
    order_id: Optional[int] = Query(None),
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """List factory expense ledger records."""
    query = db.query(Expense).order_by(Expense.expense_date.desc())
    if order_id:
        query = query.filter(Expense.order_id == order_id)

    expenses = query.limit(limit).all()
    results = []

    for exp in expenses:
        results.append(ExpenseResponse(
            id=exp.id,
            order_id=exp.order_id,
            order_number=exp.order.order_number if exp.order else None,
            category=exp.category.value if hasattr(exp.category, "value") else str(exp.category),
            amount=exp.amount,
            description=exp.description,
            expense_date=exp.expense_date,
            created_at=exp.created_at
        ))

    return results

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def record_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """Log an operational or order-linked expense."""
    if payload.order_id:
        ord = db.query(CustomerOrder).filter(CustomerOrder.id == payload.order_id).first()
        if not ord:
            raise HTTPException(status_code=404, detail="Linked order not found")

    exp = Expense(
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        order_id=payload.order_id
    )
    db.add(exp)
    db.commit()
    db.refresh(exp)

    return ExpenseResponse(
        id=exp.id,
        order_id=exp.order_id,
        order_number=exp.order.order_number if exp.order else None,
        category=exp.category.value if hasattr(exp.category, "value") else str(exp.category),
        amount=exp.amount,
        description=exp.description,
        expense_date=exp.expense_date,
        created_at=exp.created_at
    )

@router.get("/payments", response_model=List[PaymentResponse])
def list_payments(
    order_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """List buyer payment transactions."""
    query = db.query(Payment).order_by(Payment.payment_date.desc())
    if order_id:
        query = query.filter(Payment.order_id == order_id)

    payments = query.all()
    results = []

    for p in payments:
        results.append(PaymentResponse(
            id=p.id,
            order_id=p.order_id,
            order_number=p.order.order_number if p.order else "N/A",
            buyer_id=p.buyer_id,
            buyer_name=p.buyer.company_name if p.buyer else "N/A",
            amount=p.amount,
            payment_method=p.payment_method.value if hasattr(p.payment_method, "value") else str(p.payment_method),
            status=p.status.value if hasattr(p.status, "value") else str(p.status),
            transaction_reference=p.transaction_reference,
            payment_date=p.payment_date,
            created_at=p.created_at
        ))

    return results

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "accounts"))
):
    """Record payment receipt from buyer against an order."""
    ord = db.query(CustomerOrder).filter(CustomerOrder.id == payload.order_id).first()
    if not ord:
        raise HTTPException(status_code=404, detail="Order not found")

    buyer_id = payload.buyer_id or ord.buyer_id
    if not buyer_id:
        raise HTTPException(status_code=400, detail="Order does not have a linked buyer")

    payment = Payment(
        order_id=ord.id,
        buyer_id=buyer_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        status=payload.status,
        transaction_reference=payload.transaction_reference
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return PaymentResponse(
        id=payment.id,
        order_id=payment.order_id,
        order_number=ord.order_number,
        buyer_id=payment.buyer_id,
        buyer_name=ord.buyer.company_name if ord.buyer else "N/A",
        amount=payment.amount,
        payment_method=payment.payment_method.value if hasattr(payment.payment_method, "value") else str(payment.payment_method),
        status=payment.status.value if hasattr(payment.status, "value") else str(payment.status),
        transaction_reference=payment.transaction_reference,
        payment_date=payment.payment_date,
        created_at=payment.created_at
    )
