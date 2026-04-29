"""
Shared data model for a discovered Instagram target.
"""
from dataclasses import dataclass, field


@dataclass
class DiscoveredProfile:
    username: str
    platform: str = "instagram"           # always instagram for now
    profile_url: str = ""
    full_name: str | None = None
    followers: int = 0
    following: int | None = None
    posts: int | None = None
    bio: str | None = None
    external_url: str | None = None
    profile_pic_url: str | None = None
    is_verified: bool | None = None
    is_business: bool | None = None
    is_creator: bool | None = None
    is_private: bool | None = None
    business_category: str | None = None
    niche: str | None = None              # cs2 | valorant | gambling | lifestyle | crypto
    discovered_via: str = ""              # source slug
    import_batch_id: str = ""

    def __post_init__(self) -> None:
        self.username = self.username.strip().lstrip("@").lower()
        if not self.profile_url and self.username:
            self.profile_url = f"https://www.instagram.com/{self.username}/"
