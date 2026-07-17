import Foundation

/// One verse entry from the bundled VerseOfTheDay.json (366 entries, one per day of year).
struct DailyVerse: Decodable {
    let dayOfYear: Int
    let ref: String
    let text: String
}

/// Loads the bundled verse-of-the-day data. Fully offline: the JSON ships
/// inside both the watch app bundle and the complication extension bundle.
enum VerseOfTheDay {
    static let all: [DailyVerse] = {
        guard let url = Bundle.main.url(forResource: "VerseOfTheDay", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let verses = try? JSONDecoder().decode([DailyVerse].self, from: data)
        else { return [] }
        return verses.sorted { $0.dayOfYear < $1.dayOfYear }
    }()

    static func verse(for date: Date, calendar: Calendar = .current) -> DailyVerse {
        guard !all.isEmpty else {
            return DailyVerse(
                dayOfYear: 1,
                ref: "John 3:16",
                text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life."
            )
        }
        let day = calendar.ordinality(of: .day, in: .year, for: date) ?? 1
        return all[(day - 1) % all.count]
    }
}
