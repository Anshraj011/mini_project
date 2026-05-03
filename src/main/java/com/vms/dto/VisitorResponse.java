package com.vms.dto;

import lombok.Data;
import com.vms.model.VisitorStatus;
import java.time.LocalDateTime;

@Data
public class VisitorResponse {
    private String id;
    private String fullName;
    private String email;
    private String phone;
    private String purposeOfVisit;
    private String company;
    private String hostName;
    private String hostUsername;
    private String registeredBy;
    private String visitRequestId;
    private String photoUrl;
    private String qrCodeUrl;
    private VisitorStatus status;
    private LocalDateTime expectedVisitTime;
    private LocalDateTime visitEndTime;
    private LocalDateTime checkInTime;
    private LocalDateTime checkOutTime;
}
