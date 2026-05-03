package com.vms.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Document(collection = "visit_requests")
public class VisitRequest {
    @Id
    private String requestId;

    private String visitorName;
    private String email;
    private String phone;
    private String company;
    private String hostEmployeeId;
    private String hostEmployeeName;
    private String purpose;
    private LocalDateTime dateTime;
    private LocalDateTime visitEndTime;
    private String status;
    private String photoUrl;
    private String qrCodeUrl;
    private String preApprovedVisitorId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime decisionAt;
}
