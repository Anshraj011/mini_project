package com.vms.repository;

import com.vms.model.Visitor;
import com.vms.model.VisitorStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VisitorRepository extends MongoRepository<Visitor, String> {
    long countByStatus(VisitorStatus status);
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    List<Visitor> findByStatus(VisitorStatus status);
    List<Visitor> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Visitor> findByRegisteredBy(String registeredBy);
    List<Visitor> findByStatusAndRegisteredBy(VisitorStatus status, String registeredBy);
    List<Visitor> findByHostUsername(String hostUsername);
    List<Visitor> findByStatusAndHostUsername(VisitorStatus status, String hostUsername);
    long countByRegisteredByAndStatusAndCreatedAtBetween(String registeredBy, VisitorStatus status, LocalDateTime start, LocalDateTime end);
    List<Visitor> findByStatusInAndVisitEndTimeBefore(List<VisitorStatus> statuses, LocalDateTime time);
    List<Visitor> findByEmailIgnoreCase(String email);
}
