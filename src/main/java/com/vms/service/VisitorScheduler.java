package com.vms.service;

import com.vms.model.Visitor;
import com.vms.model.VisitorStatus;
import com.vms.repository.VisitorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class VisitorScheduler {

    private final VisitorRepository visitorRepository;

    /**
     * Runs every 15 minutes to mark expired visitor requests.
     * Rule #8: If visitor does not check in during window, status -> EXPIRED.
     */
    @Scheduled(fixedRate = 900000) // 15 minutes
    public void expireOldRequests() {
        log.info("Running Visitor Expiry Scheduler...");
        LocalDateTime now = LocalDateTime.now();
        
        List<VisitorStatus> targetStatuses = Arrays.asList(
            VisitorStatus.PENDING, 
            VisitorStatus.APPROVED, 
            VisitorStatus.PRE_APPROVED
        );

        List<Visitor> expiredVisitors = visitorRepository.findByStatusInAndVisitEndTimeBefore(targetStatuses, now);
        
        if (!expiredVisitors.isEmpty()) {
            log.info("Found {} expired visitor requests. Marking as EXPIRED.", expiredVisitors.size());
            expiredVisitors.forEach(v -> {
                v.setStatus(VisitorStatus.EXPIRED);
                v.setUpdatedAt(now);
            });
            visitorRepository.saveAll(expiredVisitors);
        }
    }
}
