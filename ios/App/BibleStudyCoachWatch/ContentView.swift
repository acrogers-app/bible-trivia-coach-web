import SwiftUI

struct ContentView: View {
    private var verse: DailyVerse { VerseOfTheDay.verse(for: Date()) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Verse of the Day")
                    .font(.footnote.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(.secondary)

                Text(verse.text)
                    .font(.system(.body, design: .serif))
                    .lineSpacing(3)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Text(verse.ref)
                    .font(.headline)
                    .foregroundStyle(.tint)
            }
            .padding(.horizontal, 4)
            .padding(.bottom, 8)
        }
        .navigationTitle("Today")
    }
}

#Preview {
    NavigationStack {
        ContentView()
    }
}
