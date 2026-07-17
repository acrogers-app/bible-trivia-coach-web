import SwiftUI
import WidgetKit

struct VerseEntry: TimelineEntry {
    let date: Date
    let verse: DailyVerse
}

struct VerseTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> VerseEntry {
        VerseEntry(date: .now, verse: VerseOfTheDay.verse(for: .now))
    }

    func getSnapshot(in context: Context, completion: @escaping (VerseEntry) -> Void) {
        completion(VerseEntry(date: .now, verse: VerseOfTheDay.verse(for: .now)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VerseEntry>) -> Void) {
        let now = Date()
        let midnight = Calendar.current.nextDate(
            after: now,
            matching: DateComponents(hour: 0, minute: 0, second: 0),
            matchingPolicy: .nextTime
        ) ?? now.addingTimeInterval(24 * 60 * 60)

        let entries = [
            VerseEntry(date: now, verse: VerseOfTheDay.verse(for: now)),
            VerseEntry(date: midnight, verse: VerseOfTheDay.verse(for: midnight)),
        ]
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct VerseComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: VerseEntry

    var body: some View {
        switch family {
        case .accessoryInline:
            Text(entry.verse.ref)
        default:
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.verse.ref)
                    .font(.headline)
                    .widgetAccentable()
                Text(entry.verse.text)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

struct VerseOfTheDayComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "VerseOfTheDay", provider: VerseTimelineProvider()) { entry in
            VerseComplicationView(entry: entry)
                .containerBackground(for: .widget) { Color.clear }
        }
        .configurationDisplayName("Verse of the Day")
        .description("Today's Bible verse from Bible Study Coach.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

@main
struct BibleStudyCoachComplicationBundle: WidgetBundle {
    var body: some Widget {
        VerseOfTheDayComplication()
    }
}
