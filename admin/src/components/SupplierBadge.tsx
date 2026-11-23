import React from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

import '@/assets/css/supplier-badge.css'

interface SupplierBadgeProps {
    supplier: bookcarsTypes.User
}

const SupplierBadge = ({ supplier }: SupplierBadgeProps) => {
    return supplier && (
        <div className="supplier-badge" title={supplier.fullName}>
            <span className="supplier-badge-logo">
                <img src={helper.getUserAvatarUrl(supplier.avatar)} alt={supplier.fullName} />
            </span>
            <a href={`/supplier?c=${supplier._id}`} className="supplier-badge-info">
                {supplier.fullName}
            </a>
        </div>
    )
}

export default SupplierBadge
