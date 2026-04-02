use spacetimedb::SpacetimeType;

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum PermissionLevel { Member = 1, Staff = 2, CEO = 3 }

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum EventStatus { Draft = 0, Published = 1, InProgress = 2, Completed = 3, Cancelled = 4 }

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum ParticipantStatus { Pending = 0, Accepted = 1, Declined = 2}

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum ParticipantRole { Host = 0, Participant = 1 }

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum SubEventType { FlyIn = 0, FlyOut = 1, GroupFlight = 2 }

#[derive(SpacetimeType, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum ApplicationStatus {Pending = 0, Approved = 1, Rejected = 2}