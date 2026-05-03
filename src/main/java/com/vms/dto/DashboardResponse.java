package com.vms.dto;

import lombok.Data;

@Data
public class DashboardResponse {
    private long totalVisitorsToday;
    private long pendingApprovalsCount;
    private long approvedVisitorsCount;
    private long checkedInVisitorsCount;
    private long rejectedVisitorsCount;
}
